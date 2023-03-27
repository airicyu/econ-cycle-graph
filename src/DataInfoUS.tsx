import { DateTime } from "luxon";
import { data as usCoreInflationRateRawData } from "./data/us_core_inflation_rate.js";
import { data as usOutputGapRawData } from "./data/us_output_gap.js";
import { data as usOutputGapRawData2 } from "./data/us_output_gap2.js";
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Scatter } from "react-chartjs-2";
import { Table } from "antd";
import Row from "antd/es/grid/row.js";
import Col from "antd/es/grid/col.js";
import { useState } from "react";

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

/**
 * parse inflation rate raw data into records
 *
 * desc data
 *
 * @param data
 * @returns
 */
const parseCoreInflationRateRawData = (data: string) => {
  const yearDataRows = data.split("\n").slice(1);
  return yearDataRows
    .map((row) => {
      const rowDataCols = row
        .split(" \t")
        .map((self) => self.trim())
        .filter((self) => self !== "");
      const yearMonthData = [];
      for (let i = 1; i < rowDataCols.length; i++) {
        if (i === 13) {
          break;
        }
        yearMonthData.push({
          yearMonth: `${rowDataCols[0]}-${("" + i).padStart(2, "0")}`,
          value: +rowDataCols[i],
        });
      }
      return yearMonthData;
    })
    .flatMap((self) => self)
    .sort((a, b) => {
      if (a.yearMonth < b.yearMonth) {
        return 1;
      } else if (a.yearMonth > b.yearMonth) {
        return -1;
      } else {
        return 0;
      }
    });
};

/**
 * parse output gap raw data into records
 *
 * desc data
 *
 * @param data
 * @returns
 */
const parseOutputGapRawData = (data: string) => {
  const dataRows = data.split("\n").filter((self) => self !== "Date 	Value");
  return dataRows
    .map((row) => {
      return {
        yearMonth: DateTime.fromFormat(
          row.split(" \t")[0].trim(),
          "MMMM dd, yyyy"
        ).toFormat("yyyy-MM"),
        value: +row.split(" \t")[1].trim().replace("%", ""),
      };
    })
    .sort((a, b) => {
      if (a.yearMonth < b.yearMonth) {
        return 1;
      } else if (a.yearMonth > b.yearMonth) {
        return -1;
      } else {
        return 0;
      }
    });
};

/**
 * parse output gap raw data 2 into records
 *
 * desc data
 *
 * @param data
 * @returns
 */
const parseOutputGapRawData2 = (data: number[][]) => {
  return data
    .map((row) => {
      return {
        yearMonth: DateTime.fromMillis(row[0]).toFormat("yyyy-MM"),
        value: row[1],
      };
    })
    .sort((a, b) => {
      if (a.yearMonth < b.yearMonth) {
        return 1;
      } else if (a.yearMonth > b.yearMonth) {
        return -1;
      } else {
        return 0;
      }
    });
};

/**
 * fill data gap for output gap data
 * @param data
 * @param untilYearMonth
 * @returns
 */
const fillOutputGapDataGap = (
  data: { yearMonth: string; value: number }[],
  untilYearMonth: string
) => {
  const out = [];
  const startYearMonth = data[data.length - 1].yearMonth;
  const endYearMonth = data[0].yearMonth;
  const startYear = startYearMonth.split("-")[0];
  const endYear = endYearMonth.split("-")[0];

  for (let i = +startYear; i <= +endYear; i++) {
    for (let j = 1; j <= 12; j++) {
      const currYearMonth = `${i}-${("" + j).padStart(2, "0")}`;

      if (currYearMonth < startYearMonth || currYearMonth > endYearMonth) {
        continue;
      }

      const existingCurrentDataIndex = data.findIndex(
        (v) => v.yearMonth === currYearMonth
      );
      if (existingCurrentDataIndex >= 0) {
        // no need fill
        out.push(data[existingCurrentDataIndex]);
      } else {
        // find next monthly data which exist
        const nextDataIndex =
          data.findIndex((v) => v.yearMonth <= currYearMonth) - 1;
        const nextData = data[nextDataIndex];

        // find prev monthly data which exist
        const lastData = data[nextDataIndex + 1];

        // num of months between two monthly data
        const monthDiff =
          i * 12 +
          j -
          (+lastData.yearMonth.split("-")[0] * 12 +
            +lastData.yearMonth.split("-")[1]);

        // fill by predict data linearly
        const predictData =
          ((nextData.value - lastData.value) * monthDiff) / 3 + lastData.value;
        out.push({
          yearMonth: currYearMonth,
          value: predictData,
        });
      }
    }
  }

  // if there are no "next monthly data", prev logic block can't fill them.
  // we use latest monthly data to padd at the end.
  if (endYearMonth < untilYearMonth) {
    const lastMonthData = out[out.length - 1];
    for (let i = +endYear; i <= +untilYearMonth.split("-")[0]; i++) {
      for (let j = 1; j <= 12; j++) {
        const currYearMonth = `${i}-${("" + j).padStart(2, "0")}`;
        if (currYearMonth <= endYearMonth || currYearMonth > untilYearMonth) {
          continue;
        }

        out.push({
          yearMonth: currYearMonth,
          value: lastMonthData.value,
        });
      }
    }
  }

  return out.sort((a, b) => {
    if (a.yearMonth < b.yearMonth) {
      return 1;
    } else if (a.yearMonth > b.yearMonth) {
      return -1;
    } else {
      return 0;
    }
  });
};

export const DataInfoUS = (props: any) => {
  // only show last 24 data points
  const [showLastNData, setShowLastNData] = useState(24);

  // -2, 2, 6
  const coreInflationRateData = parseCoreInflationRateRawData(
    usCoreInflationRateRawData
  );

  // -4, 0, 4
  const outputGapDataRaw = parseOutputGapRawData2(usOutputGapRawData2);
  const outputGapData = fillOutputGapDataGap(
    outputGapDataRaw,
    coreInflationRateData[0].yearMonth
  );

  console.log("usCoreInflationRateData", coreInflationRateData);
  console.log("usoutputGapData", outputGapData);

  let dataset = [];
  let labels = [];

  for (let i = 0; i < showLastNData; i++) {
    const yIndex = outputGapData.findIndex(
      (v) => v.yearMonth <= coreInflationRateData[i].yearMonth
    );

    if (yIndex === -1) {
      continue;
    }
    dataset.push({
      yearMonth: coreInflationRateData[i].yearMonth,
      x: coreInflationRateData[i].value,
      y: outputGapData[yIndex].value,
    });
    labels.push(coreInflationRateData[i].yearMonth);
  }

  // graduate color points
  const backgroundColors = dataset.map((_, i) => {
    return `rgba(${50 + Math.round((180 * i) / dataset.length)}, ${
      50 + Math.round((180 * i) / dataset.length)
    }, 100, 1)`;
  });

  const chartData = {
    datasets: [
      {
        label: "cycle",
        data: dataset,
        showLine: true,
        borderWidth: 1,
        borderColor: "rgba(200, 200, 200, 100)",
        fill: false,
        backgroundColor: backgroundColors,
      },
    ],
  };

  const chartOptions = {
    scales: {
      x: {
        type: "linear",
        title: {
          text: "US Core Inflation Rate (%)",
          display: true,
        },
        min: -3,
        max: 7,
      },
      y: {
        type: "linear",
        title: {
          text: "US output gap (%)",
          display: true,
        },
        min: -10,
        max: 6,
      },
      x1: {
        type: "linear",
        min: -3,
        max: 7,
        display: true,
        position: {
          y: 0,
        },
        border: {
          width: 5,
        },
        ticks: {
          display: false,
        },
      },
      y1: {
        type: "linear",
        min: -10,
        max: 6,
        display: true,
        position: {
          x: 2,
        },
        border: {
          width: 5,
        },
        ticks: {
          display: false,
        },
      },
    },
    // interaction: {
    //   intersect: false,
    //   mode: "index",
    // },
    plugins: {
      tooltip: {
        callbacks: {
          caretX: 1,
          caretY: 1,
          title: (tooltipItems: any) => "",
          label: (tooltipItem: any) => "",
          afterLabel: (tooltipItem: any) =>
            `${tooltipItem.raw.yearMonth}\n` +
            `Inflation rate(X): ${tooltipItem.parsed.x} %\n` +
            `Output gap(Y): ${tooltipItem.parsed.y} %\n`,
        },
      },
    },
  } as any;

  return (
    <div style={{ width: "100%" }}>
      <h1>US</h1>
      <Row>
        <Col>
          Show last{" "}
          <input
            value={showLastNData}
            onChange={(e) => {
              setShowLastNData(+e.target.value ?? 24);
            }}
          ></input>{" "}
          month
        </Col>
      </Row>
      <Row>
        <Scatter data={chartData} options={chartOptions} />
      </Row>
      <Row>
        <Col span={5}>
          <Table
            bordered={true}
            caption={"US Core Inflation Rate"}
            dataSource={coreInflationRateData.map((_) => {
              return { ..._, key: _.yearMonth };
            })}
            columns={[
              { title: "Year-Month", dataIndex: "yearMonth", key: "yearMonth" },
              { title: "%", dataIndex: "value", key: "value" },
            ]}
          ></Table>
        </Col>
        <Col span={1}></Col>
        <Col span={5}>
          <Table
            bordered={true}
            caption={"US output gap"}
            dataSource={outputGapDataRaw.map((_) => {
              return { ..._, key: _.yearMonth };
            })}
            columns={[
              { title: "Year-Month", dataIndex: "yearMonth", key: "yearMonth" },
              { title: "%", dataIndex: "value", key: "value" },
            ]}
          ></Table>
        </Col>
      </Row>
    </div>
  );
};
