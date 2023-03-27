import { data as cnCoreInflationRateRawData } from "./data/china_core_inflation_rate";
import { data as cnOutputRawData } from "./data/cn_output";
import {
  Chart as ChartJS,
  LinearScale,
  CategoryScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Scatter } from "react-chartjs-2";
import { Table } from "antd";
import Row from "antd/es/grid/row.js";
import Col from "antd/es/grid/col.js";
import { useState } from "react";

ChartJS.register(
  LinearScale,
  CategoryScale,
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
const parseCoreInflationRateRawData = (data: string[][]) => {
  const yearDataRows = data;
  return yearDataRows
    .map((row) => {
      return {
        yearMonth: row[0].substring(0, 7),
        value: +row[1],
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
 * parse output gap raw data into records
 *
 * desc data
 *
 * @param data
 * @returns
 */
const parseOutputRawData = (data: string[][]) => {
  const yearDataRows = data;
  return yearDataRows
    .map((row) => {
      return {
        yearMonth: row[0].substring(0, 7),
        value: +row[1],
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
const parseOutputGapData = (data: { yearMonth: string; value: number }[]) => {
  const yearDataRows = data;
  return yearDataRows
    .map((row) => {
      const year = +row.yearMonth.substring(0, 4);
      const month = +row.yearMonth.substring(5, 7);
      const gap =
        +row.value -
        (100 +
          ((127 - 100) / (2024 * 12 + 6 - (2019 * 12 + 12))) *
            (year * 12 + month - (2019 * 12 + 12)));

      return {
        yearMonth: row.yearMonth,
        value: gap,
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

export const DataInfoCN = (props: any) => {
  // only show last 24 data points
  const [showLastNData, setShowLastNData] = useState(24);

  // 0.3, 1.3, 2.3
  const coreInflationRateData = parseCoreInflationRateRawData(
    cnCoreInflationRateRawData
  );

  // -4, 0, 4
  const outputData = parseOutputRawData(cnOutputRawData);
  const outputGapDataRaw = parseOutputGapData(outputData);
  const outputGapData = fillOutputGapDataGap(
    outputGapDataRaw,
    coreInflationRateData[0].yearMonth
  );

  console.log("cnCoreInflationRateData", coreInflationRateData);
  console.log("cnoutputGapData", outputGapData);

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
          text: "CN Core Inflation Rate (%)",
          display: true,
        },
        min: 0,
        max: 3,
      },
      y: {
        type: "linear",
        title: {
          text: "Estimated CN output gap(2019Q4=100) (%)",
          display: true,
        },
        min: -6,
        max: 6,
      },
      x1: {
        type: "linear",
        min: 0,
        max: 3,
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
        min: -6,
        max: 6,
        display: true,
        position: {
          x: 1.3,
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
      <h1>CN</h1>
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
            caption={"CN Core Inflation Rate"}
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
            caption={"Estimated CN output gap (2019Q4=100)"}
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
      <Row>
        <Col span={10}>
          <h2>CN Core inflation rate</h2>
          <Line
            data={{
              labels: coreInflationRateData
                .slice(0, 48)
                .map((_) => _.yearMonth)
                .reverse(),
              datasets: [
                {
                  label: "Core Inflation Rate",
                  data: coreInflationRateData
                    .slice(0, 48)
                    .map((_) => _.value)
                    .reverse(),
                  showLine: true,
                  borderColor: "rgb(255, 99, 132)",
                  backgroundColor: "rgba(255, 99, 132, 0.5)",
                },
              ],
            }}
            options={{} as any}
          />
        </Col>
        <Col span={1}></Col>
        <Col span={10}>
          <h2>Estimated CN output gap</h2>
          <Line
            data={{
              labels: outputData.map((_) => _.yearMonth).reverse(),
              datasets: [
                {
                  label: "Output Potential",
                  data: outputData.map(
                    (_, i) =>
                      100 +
                      ((127 - 100) / (2024 * 12 + 6 - (2019 * 12 + 12))) * i * 3
                  ),
                  showLine: true,
                  borderColor: "rgb(155, 99, 182)",
                  backgroundColor: "rgba(155, 99, 182, 0.5)",
                },
                {
                  label: "Output",
                  data: outputData.map((_) => _.value).reverse(),
                  showLine: true,
                  borderColor: "rgb(255, 99, 132)",
                  backgroundColor: "rgba(255, 99, 132, 0.5)",
                },
              ],
            }}
            options={{} as any}
          />
        </Col>
      </Row>
    </div>
  );
};
