import React from "react";
import logo from "./logo.svg";
import "./App.css";
import { DataInfoUS } from "./DataInfoUS";
import { DataInfoCN } from "./DataInfoCN";
import { Row } from "antd";

function App() {
  return (
    <div className="App">
      <Row>
        <DataInfoUS></DataInfoUS>
      </Row>
      <hr />
      <Row>
        <DataInfoCN></DataInfoCN>
      </Row>
    </div>
  );
}

export default App;
