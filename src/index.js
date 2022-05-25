import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { createChart, CrosshairMode } from "lightweight-charts";

import "./styles.css";
import axios from "axios";
import moment from "moment";

import Dropdown from "react-dropdown";
import "react-dropdown/style.css";

const durations = [
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "8h",
  "12h",
  "1d",
  "3d",
  "1w",
  "1M",
];

function App() {
  const chartContainerRef = useRef();
  const chart = useRef();
  const resizeObserver = useRef();
  const candleSeries = useRef();

  const [assets, setAssets] = useState([]);
  const [asset, setAsset] = useState();
  const [duration, setDuration] = useState();

  useEffect(() => {
    chart.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        backgroundColor: "#253248",
        textColor: "rgba(255, 255, 255, 0.9)",
      },
      grid: {
        vertLines: {
          color: "#334158",
        },
        horzLines: {
          color: "#334158",
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      priceScale: {
        borderColor: "#485c7b",
      },
      timeScale: {
        borderColor: "#485c7b",
      },
    });

    candleSeries.current = chart.current.addCandlestickSeries({
      upColor: "#4bffb5",
      downColor: "#ff4976",
      borderDownColor: "#ff4976",
      borderUpColor: "#4bffb5",
      wickDownColor: "#838ca1",
      wickUpColor: "#838ca1",
    });
  }, []);

  useEffect(() => {
    axios
      .get("https://api.binance.com/api/v3/exchangeInfo")
      .then(({ data }) => {
        const symbols = data.symbols
          .filter((item) => item.status === "TRADING")
          .map((item) => item.symbol);
        setAssets(symbols);
        setAsset(symbols[0]);
        setDuration(durations[0]);
      })
      .catch((error) => {
        alert(error.message);
      });
  }, []);

  useEffect(() => {
    if (asset && duration) {
      axios
        .get("https://api.binance.com/api/v3/klines", {
          params: {
            symbol: asset,
            interval: duration,
            startTime: new Date(moment().subtract(500, "m")).getTime(),
            endTime: new Date().getTime(),
          },
        })
        .then(({ data }) => {
          const candleData = data.map((item) => ({
            time: item[0] / 1000,
            open: item[1],
            high: item[2],
            low: item[3],
            close: item[4],
          }));

          candleSeries.current.setData(candleData);
        })
        .catch((err) => {
          alert(err.message);
        });
    }
  }, [asset, duration]);

  useEffect(() => {
    if (asset && duration) {
      const binanceSocket = new WebSocket(
        `wss://stream.binance.com:9443/ws/${asset.toLowerCase()}@kline_${duration}`
      );

      binanceSocket.onmessage = (event) => {
        const message = JSON.parse(event.data);

        const candleStick = message.k;

        candleSeries.current.update({
          time: candleStick.t / 1000,
          open: candleStick.o,
          high: candleStick.h,
          low: candleStick.l,
          close: candleStick.c,
        });
      };

      return () => binanceSocket.close();
    }
  }, [asset, duration]);

  // Resize chart on container resizes.
  useEffect(() => {
    resizeObserver.current = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      chart.current.applyOptions({ width, height });
      setTimeout(() => {
        chart.current.timeScale().fitContent();
      }, 0);
    });

    resizeObserver.current.observe(chartContainerRef.current);

    return () => resizeObserver.current.disconnect();
  }, []);

  const onAssetChange = (item) => {
    setAsset(item.value);
  };

  const onDurationChange = (item) => {
    setDuration(item.value);
  };

  return (
    <div className="App">
      <div>
        <Dropdown
          options={assets}
          onChange={onAssetChange}
          value={asset}
          placeholder="Select an asset"
        />
        <Dropdown
          options={durations}
          onChange={onDurationChange}
          value={duration}
          placeholder="Select a duration"
        />
      </div>
      <div ref={chartContainerRef} className="chart-container" />
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
