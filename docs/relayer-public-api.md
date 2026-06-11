# Public API

**Endpoint URL**

`API_ENDPOINT_PRODUCTION = https://relayer.twilight.rest`

`API_ENDPOINT_STAGING = https://app.twilight.rest`

## Request Structure

All public API requests must be sent to:

**`API_ENDPOINT/api`**

For example:

- Production: `https://relayer.twilight.rest/api`
- Staging: `https://app.twilight.rest/api`

### Request Format

| Component    | Description                    |
| ------------ | ------------------------------ |
| URL          | `API_ENDPOINT/api`             |
| Method       | `POST`                         |
| Content-Type | `application/json`             |
| Body         | JSON-RPC 2.0 formatted request |

---

# Data API

The Data API provides publicly available market data, analytics, and system information. These endpoints do not require authentication and are designed for market monitoring, analysis, and data feeds.

## Market Data

### Candle Data

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "candle_data",
  id: 123,
  params: {
    interval: "ONE_DAY",
    since: "2023-09-25T00:01:00.0Z",
    limit: 20,
    offset: 0,
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "btc_volume": "234549776",
      "close": "42988.8099999999976716935634613037109375",
      "end": "2024-01-31T00:00:59.907514Z",
      "high": "43867.3799999999973806552588939666748046875",
      "low": "42686",
      "open": "43493.2600000000020372681319713592529296875",
      "resolution": "1 day",
      "start": "2024-01-30T11:00:17.892660Z",
      "trades": 27,
      "usd_volume": "1172748.880000000048312358558177947998046875"
    },
    {
      "btc_volume": "173740820",
      "close": "42507.33999999999650754034519195556640625",
      "end": "2024-01-31T10:51:37.281376Z",
      "high": "43107.7699999999967985786497592926025390625",
      "low": "42462.639999999999417923390865325927734375",
      "open": "42990.6200000000026193447411060333251953125",
      "resolution": "1 day",
      "start": "2024-01-31T00:01:00.908144Z",
      "trades": 20,
      "usd_volume": "868704.100000000034924596548080444335937500"
    }
  ],
  "id": 123
}
```

**Description:** Retrieves OHLCV (Open, High, Low, Close, Volume) candle data for technical analysis and chart visualization of BTC-USD perpetual contracts.

**Use Cases:**

- Technical analysis for trading strategies and pattern recognition
- Chart visualization for web and mobile trading applications
- Algorithm development for automated trading systems
- Market trend analysis and volatility assessment
- Historical backtesting of trading strategies

Candle data (Kline data: 1min, 5min, 15min, 30min, 1hr, 4hr, 8hr, 12hr, 24hr, daily change)

### HTTP Method

`POST`

### RPC Method

`candle_data`

### Message Parameters

| Params   | Data_Type | Values                                                                                                                                            |
| -------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| interval | string    | `ONE_MINUTE`, `FIVE_MINUTE`, `FIFTEEN_MINUTE`, `THIRTY_MINUTE`, `ONE_HOUR`, `FOUR_HOUR`, `EIGHT_HOUR`, `TWELVE_HOUR`, `ONE_DAY`, `ONE_DAY_CHANGE` |
| since    | datetime  | Start time (ISO 8601)                                                                                                                             |
| limit    | integer   | Number of entries (max 5000)                                                                                                                      |
| offset   | integer   | Page offset                                                                                                                                       |

### Response Fields

| Field      | Data_Type | Description                                        |
| ---------- | --------- | -------------------------------------------------- |
| btc_volume | string    | BTC trading volume for the period                  |
| close      | string    | Closing price for the period                       |
| end        | string    | End timestamp of the candle period (ISO 8601)      |
| high       | string    | Highest price during the period                    |
| low        | string    | Lowest price during the period                     |
| open       | string    | Opening price for the period                       |
| resolution | string    | Time interval resolution (e.g., "1 day", "1 hour") |
| start      | string    | Start timestamp of the candle period (ISO 8601)    |
| trades     | integer   | Number of trades executed during the period        |
| usd_volume | string    | USD trading volume for the period                  |

### BTC USD Price

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "btc_usd_price",
  id: 123,
  params: null,
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "id": 45551,
    "price": "42447.0400000000008731149137020111083984375",
    "timestamp": "2024-01-31T11:01:30.907388Z"
  },
  "id": 123
}
```

**Description:** Returns the current BTC-USD price from the perpetual contract, providing real-time price information for trading and valuation.

**Use Cases:**

- Real-time price feeds for trading applications and market data display
- Portfolio valuation and mark-to-market calculations
- Price alerts and notification systems for traders
- Risk management and position monitoring systems
- Market data synchronization and price validation

BTC USD Price

### HTTP Method

`POST`

### RPC Method

`btc_usd_price`

### Message Parameters

| Params | Data_Type | Values                 |
| ------ | --------- | ---------------------- |
| N/A    | null      | No parameters required |

### Response Fields

| Field     | Data_Type | Description                       |
| --------- | --------- | --------------------------------- |
| id        | integer   | Internal price record ID          |
| price     | string    | Current BTC-USD price             |
| timestamp | string    | Price timestamp (ISO 8601 format) |

### Historical Price

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "historical_price",
  id: 123,
  params: {
    from: "2024-01-14T00:00:00Z",
    to: "2024-01-31T01:00:00Z",
    limit: 3,
    offset: 0,
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "id": 1,
      "price": "43493.2600000000020372681319713592529296875",
      "timestamp": "2024-01-30T11:00:17.892660Z"
    },
    {
      "id": 2,
      "price": "43493.2699999999967985786497592926025390625",
      "timestamp": "2024-01-30T11:00:18.894869Z"
    },
    {
      "id": 3,
      "price": "43493.2600000000020372681319713592529296875",
      "timestamp": "2024-01-30T11:00:19.895641Z"
    }
  ],
  "id": 123
}
```

**Description:** Retrieves historical BTC-USD price data for backtesting, analysis, and research purposes across specified time ranges.

**Use Cases:**

- Historical backtesting of trading strategies and algorithm development
- Price trend analysis and technical indicator calculation
- Research and academic studies on cryptocurrency market behavior
- Compliance reporting and regulatory data requirements
- Performance attribution and risk analysis for portfolio management

Historical BTC price

### HTTP Method

`POST`

### RPC Method

`historical_price`

### Message Parameters

| Params | Data_Type | Values                   |
| ------ | --------- | ------------------------ |
| from   | datetime  | Start time (ISO 8601)    |
| to     | datetime  | End time (ISO 8601)      |
| limit  | integer   | Number of entries (max 5000) |
| offset | integer   | Page offset              |

### Response Fields

| Field     | Data_Type | Description                       |
| --------- | --------- | --------------------------------- |
| id        | integer   | Internal price record ID          |
| price     | string    | Historical BTC-USD price          |
| timestamp | string    | Price timestamp (ISO 8601 format) |

### Get Funding Rate

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "get_funding_rate",
  id: 123,
  params: null,
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "id": 23,
    "price": "42643.9899999999979627318680286407470703125",
    "rate": "0",
    "timestamp": "2024-01-31T10:00:00.075603Z"
  },
  "id": 123
}
```

**Description:** Retrieves the current funding rate for BTC-USD perpetual contracts, essential for understanding the cost of holding positions and market sentiment.

**Use Cases:**

- Position cost calculation for margin trading and leverage strategies
- Market sentiment analysis to gauge bullish/bearish positioning
- Arbitrage opportunities between funding rates across Relayer-matchbooks
- Risk management for long-term position holding
- Algorithmic trading signal generation based on funding rate trends

Current funding rate

### HTTP Method

`POST`

### RPC Method

`get_funding_rate`

### Message Parameters

| Params | Data_Type | Values                 |
| ------ | --------- | ---------------------- |
| N/A    | null      | No parameters required |

### Response Fields

| Field     | Data_Type | Description                                |
| --------- | --------- | ------------------------------------------ |
| id        | integer   | Internal funding rate record ID            |
| price     | string    | BTC-USD price at funding time              |
| rate      | string    | Current funding rate                       |
| timestamp | string    | Funding rate timestamp (ISO 8601 format)   |

### Historical Funding Rate

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "historical_funding_rate",
  id: 123,
  params: {
    from: "2024-01-13T00:00:00Z",
    to: "2024-02-15T01:00:00Z",
    limit: 3,
    offset: 0,
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "id": 1,
      "price": "43537.7399999999979627318680286407470703125",
      "rate": "0.125",
      "timestamp": "2024-01-30T12:00:00.027626Z"
    },
    {
      "id": 2,
      "price": "43436.860000000000582076609134674072265625",
      "rate": "0.125",
      "timestamp": "2024-01-30T13:00:00.026145Z"
    },
    {
      "id": 3,
      "price": "43287.610000000000582076609134674072265625",
      "rate": "0.125",
      "timestamp": "2024-01-30T14:00:00.070450Z"
    }
  ],
  "id": 123
}
```

**Description:** Provides historical funding rate data for analyzing past market conditions and developing predictive models for funding rate movements.

**Use Cases:**

- Historical analysis for funding rate pattern recognition and forecasting
- Backtesting of funding rate arbitrage strategies across different time periods
- Research and development of predictive models for funding rate movements
- Compliance reporting and audit trail for regulatory requirements
- Performance attribution analysis for portfolio management

Historical funding rate

### HTTP Method

`POST`

### RPC Method

`historical_funding_rate`

### Message Parameters

| Params | Data_Type | Values                   |
| ------ | --------- | ------------------------ |
| from   | datetime  | Start time (ISO 8601)    |
| to     | datetime  | End time (ISO 8601)      |
| limit  | integer   | Number of entries (max 5000) |
| offset | integer   | Page offset              |

### Response Fields

| Field     | Data_Type | Description                              |
| --------- | --------- | ---------------------------------------- |
| id        | integer   | Internal funding rate record ID          |
| price     | string    | BTC-USD price at funding time            |
| rate      | string    | Funding rate for the period              |
| timestamp | string    | Funding rate timestamp (ISO 8601 format) |

### Get Fee Rate

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "get_fee_rate",
  id: 123,
  params: null,
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "id": 42,
    "order_filled_on_market": "0.0005",
    "order_filled_on_limit": "0.00025",
    "order_settled_on_market": "0.00075",
    "order_settled_on_limit": "0.0005",
    "timestamp": "2024-02-27T12:00:00Z"
  },
  "id": 123
}
```

**Description:** Returns the current trading fee structure for different order types and execution scenarios on the Relayer-matchbook.

**Use Cases:**

- Trading cost calculation and profitability analysis for different strategies
- Fee optimization strategies for high-frequency and algorithmic trading
- Order type selection based on fee structure and market conditions
- Cost-benefit analysis for market making vs. taking strategies
- Compliance and transparency for fee disclosure requirements

Current fee rate

### HTTP Method

`POST`

### RPC Method

`get_fee_rate`

### Message Parameters

| Params | Data_Type | Values                 |
| ------ | --------- | ---------------------- |
| N/A    | null      | No parameters required |

### Response Fields

| Field                   | Data_Type | Description                                    |
| ----------------------- | --------- | ---------------------------------------------- |
| id                      | integer   | Internal fee rate record ID                    |
| order_filled_on_market  | string    | Fee rate for market orders when filled          |
| order_filled_on_limit   | string    | Fee rate for limit orders when filled           |
| order_settled_on_market | string    | Fee rate for market orders when settled          |
| order_settled_on_limit  | string    | Fee rate for limit orders when settled           |
| timestamp               | string    | Fee rate timestamp (ISO 8601 format)            |

### Historical Fee Rate

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "historical_fee_rate",
  id: 123,
  params: {
    from: "2024-01-01T00:00:00Z",
    to: "2024-02-01T00:00:00Z",
    limit: 3,
    offset: 0,
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "id": 40,
      "order_filled_on_market": "0.0005",
      "order_filled_on_limit": "0.00025",
      "order_settled_on_market": "0.00075",
      "order_settled_on_limit": "0.0005",
      "timestamp": "2024-01-28T12:00:00Z"
    },
    {
      "id": 41,
      "order_filled_on_market": "0.0005",
      "order_filled_on_limit": "0.00025",
      "order_settled_on_market": "0.00075",
      "order_settled_on_limit": "0.0005",
      "timestamp": "2024-01-29T12:00:00Z"
    },
    {
      "id": 42,
      "order_filled_on_market": "0.0005",
      "order_filled_on_limit": "0.00025",
      "order_settled_on_market": "0.00075",
      "order_settled_on_limit": "0.0005",
      "timestamp": "2024-01-30T12:00:00Z"
    }
  ],
  "id": 123
}
```

**Description:** Provides historical trading fee data for analyzing fee trends and optimizing trading strategies over time.

**Use Cases:**

- Historical fee analysis for trading strategy optimization and cost modeling
- Backtesting with accurate fee calculations for realistic performance metrics
- Fee trend analysis for predicting future fee changes and planning
- Compliance reporting and audit requirements for fee transparency
- Cost analysis for institutional trading and volume-based fee negotiations

Historical fee rate

### HTTP Method

`POST`

### RPC Method

`historical_fee_rate`

### Message Parameters

| Params | Data_Type | Values                   |
| ------ | --------- | ------------------------ |
| from   | datetime  | Start time (ISO 8601)    |
| to     | datetime  | End time (ISO 8601)      |
| limit  | integer   | Number of entries (max 5000) |
| offset | integer   | Page offset              |

### Response Fields

| Field                   | Data_Type | Description                                    |
| ----------------------- | --------- | ---------------------------------------------- |
| id                      | integer   | Internal fee rate record ID                    |
| order_filled_on_market  | string    | Fee rate for market orders when filled          |
| order_filled_on_limit   | string    | Fee rate for limit orders when filled           |
| order_settled_on_market | string    | Fee rate for market orders when settled          |
| order_settled_on_limit  | string    | Fee rate for limit orders when settled           |
| timestamp               | string    | Fee rate timestamp (ISO 8601 format)            |

## Market Analytics

### Position Size

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "position_size",
  id: 123,
  params: null,
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "total": "17374082",
    "total_long": "17374082",
    "total_short": "0"
  },
  "id": 123
}
```

**Description:** Provides aggregate position size information across all market participants, showing total open interest and market exposure distribution.

**Use Cases:**

- Open interest analysis for market sentiment and trend confirmation
- Risk management for position sizing and exposure calculation
- Market capacity assessment for large order planning
- Long/short ratio analysis for contrarian trading strategies
- Liquidity planning and market impact estimation

Position Size

### HTTP Method

`POST`

### RPC Method

`position_size`

### Message Parameters

| Params | Data_Type | Values                 |
| ------ | --------- | ---------------------- |
| N/A    | null      | No parameters required |

### Response Fields

| Field       | Data_Type | Description                         |
| ----------- | --------- | ----------------------------------- |
| total       | string    | Total open position size            |
| total_long  | string    | Total long position size            |
| total_short | string    | Total short position size           |

### Open Limit Orders

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "open_limit_orders",
  id: 123,
  params: null,
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "ask": [
      { "positionsize": 5000000, "price": 45000.50 }
    ],
    "bid": [
      { "positionsize": 3000000, "price": 44500.25 }
    ]
  },
  "id": 123
}
```

**Description:** Displays the current order book with open limit orders from Redis cache, showing market depth and liquidity for both buy (bid) and sell (ask) sides. Limited to top 10 entries per side.

**Use Cases:**

- Market depth analysis for optimal order placement and execution strategies
- Liquidity assessment before placing large orders to minimize slippage
- Market making strategies and spread analysis for profit opportunities
- Real-time price discovery and support/resistance level identification
- Order book imbalance detection for short-term trading signals

Open Limit Orders

### HTTP Method

`POST`

### RPC Method

`open_limit_orders`

### Message Parameters

| Params | Data_Type | Values                 |
| ------ | --------- | ---------------------- |
| N/A    | null      | No parameters required |

### Response Fields

| Field | Data_Type | Description                                  |
| ----- | --------- | -------------------------------------------- |
| ask   | array     | Array of ask (sell) orders in the order book |
| bid   | array     | Array of bid (buy) orders in the order book  |

_Each order in ask/bid arrays contains:_

| Field        | Data_Type | Description              |
| ------------ | --------- | ------------------------ |
| positionsize | number    | Size of the limit order  |
| price        | number    | Price of the limit order |

### Recent Trade Orders

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "recent_trade_orders",
  id: 123,
  params: null,
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "order_id": "a2369fcf-489b-4ddf-85f6-78ec076401d0",
      "side": "LONG",
      "price": "35000",
      "positionsize": "8686710",
      "timestamp": "2024-01-30T11:13:23.386791Z"
    },
    {
      "order_id": "b3468eda-612a-4eef-96f7-89fc186502b1",
      "side": "LONG",
      "price": "35000",
      "positionsize": "8687372",
      "timestamp": "2024-01-30T12:42:59.466955Z"
    }
  ],
  "id": 123
}
```

**Description:** Retrieves the latest executed trades from the Redis cache (last 24 hours, limited to 25 most recent). Shows real-time market activity and price discovery.

**Use Cases:**

- Real-time trade monitoring for market sentiment analysis
- Price trend analysis and momentum detection for trading strategies
- Trade volume analysis for liquidity assessment and market depth evaluation
- Last price validation and market data feed synchronization
- Historical trade reconstruction for compliance and audit purposes

Recent Trade Orders

### HTTP Method

`POST`

### RPC Method

`recent_trade_orders`

### Message Parameters

| Params | Data_Type | Values                 |
| ------ | --------- | ---------------------- |
| N/A    | null      | No parameters required |

### Response Fields

| Field        | Data_Type | Description                                 |
| ------------ | --------- | ------------------------------------------- |
| order_id     | string    | Unique identifier for the executed trade    |
| side         | string    | Trade direction ("LONG" or "SHORT")         |
| price        | string    | Execution price of the trade                |
| positionsize | string    | Size of the executed trade                  |
| timestamp    | string    | Trade execution timestamp (ISO 8601 format) |

### Pool Share Value

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "pool_share_value",
  id: 123,
  params: null,
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": 1.0253,
  "id": 123
}
```

**Description:** Returns the current value of lending pool shares, calculated as total_locked_value / total_pool_share. Essential for yield farming and liquidity provision calculations.

**Use Cases:**

- Yield calculation and return on investment analysis for lending strategies
- Pool performance monitoring and comparative analysis across time periods
- Liquidity provision optimization and capital allocation decisions
- DeFi yield farming integration and automated rebalancing strategies
- Portfolio valuation for mixed trading and lending positions

Current pool share value

### HTTP Method

`POST`

### RPC Method

`pool_share_value`

### Message Parameters

| Params | Data_Type | Values                 |
| ------ | --------- | ---------------------- |
| N/A    | null      | No parameters required |

### Response Fields

| Field  | Data_Type | Description                      |
| ------ | --------- | -------------------------------- |
| result | number    | Current value per pool share     |

### Lend Pool Info

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "lend_pool_info",
  id: 123,
  params: null,
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "id": 1,
    "sequence": 100,
    "nonce": 50,
    "total_pool_share": "1000000",
    "total_locked_value": "1025300",
    "pending_orders": 2,
    "aggregate_log_sequence": 150,
    "last_snapshot_id": 45
  },
  "id": 123
}
```

**Description:** Returns complete lending pool information including total pool shares, total locked value, and operational state.

**Use Cases:**

- Pool health monitoring and risk assessment for liquidity providers
- Share price calculation and yield estimation for DeFi strategies
- Liquidity depth analysis for lending market capacity
- Pool utilization tracking and capital efficiency optimization
- Market analytics for lending pool performance reporting

Lend Pool Info

### HTTP Method

`POST`

### RPC Method

`lend_pool_info`

### Message Parameters

| Params | Data_Type | Values                 |
| ------ | --------- | ---------------------- |
| N/A    | null      | No parameters required |

### Response Fields

| Field                  | Data_Type | Description                              |
| ---------------------- | --------- | ---------------------------------------- |
| id                     | integer   | Internal pool record ID                  |
| sequence               | integer   | Pool sequence number                     |
| nonce                  | integer   | Pool nonce                               |
| total_pool_share       | string    | Total outstanding pool shares            |
| total_locked_value     | string    | Total value locked in the pool           |
| pending_orders         | integer   | Number of pending orders in the pool     |
| aggregate_log_sequence | integer   | Aggregate log sequence number            |
| last_snapshot_id       | integer   | ID of the last pool snapshot             |

### Last Day APY

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "last_day_apy",
  id: 123,
  params: null,
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": 12.45,
  "id": 123
}
```

**Description:** Returns the annualized percentage yield (APY) computed from the lending pool's share price change over the last 24 hours.

**Use Cases:**

- Real-time yield monitoring for lending pool participants
- Comparative analysis of lending returns across DeFi protocols
- Investment decision support for capital allocation to lending pools
- Yield farming strategy optimization based on current APY
- Dashboard display for lending pool performance metrics

Last 24-hour APY

### HTTP Method

`POST`

### RPC Method

`last_day_apy`

### Message Parameters

| Params | Data_Type | Values                 |
| ------ | --------- | ---------------------- |
| N/A    | null      | No parameters required |

### Response Fields

| Field  | Data_Type      | Description                                   |
| ------ | -------------- | --------------------------------------------- |
| result | number or null | Annualized percentage yield for the last 24h  |

### APY Chart

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "apy_chart",
  id: 123,
  params: {
    range: "1d",
    step: "5m",
    lookback: "24h",
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "bucket_ts": "2024-02-27T00:00:00Z",
      "apy": "12.34"
    },
    {
      "bucket_ts": "2024-02-27T00:05:00Z",
      "apy": "12.56"
    },
    {
      "bucket_ts": "2024-02-27T00:10:00Z",
      "apy": "11.89"
    }
  ],
  "id": 123
}
```

**Description:** Returns a time series of APY data points for charting, computed from the lending pool's share price changes using the SQL `apy_series()` function. Supports configurable chart range, step interval, and lookback window.

**Use Cases:**

- APY trend visualization and historical yield analysis for lending pools
- Yield volatility assessment for risk-adjusted return analysis
- Portfolio performance charting and reporting for investors
- Comparative yield analysis across different time windows
- Automated alert generation based on APY threshold changes

APY Chart

### HTTP Method

`POST`

### RPC Method

`apy_chart`

### Message Parameters

| Params   | Data_Type | Values                                                                                                    |
| -------- | --------- | --------------------------------------------------------------------------------------------------------- |
| range    | string    | Chart range: `"1d"`, `"7d"`, `"30d"`, `"24 hours"`, `"7 days"`, `"30 days"`                              |
| step     | string    | (Optional) Step interval: `"1m"`, `"5m"`, `"15m"`, `"30m"`, `"1h"`, `"2h"`, `"4h"`, `"12h"`. Default varies by range |
| lookback | string    | (Optional) Trailing APY lookback window: `"24h"`, `"7d"`, `"30d"`. Default `"24 hours"`                   |

### Response Fields

| Field     | Data_Type | Description                               |
| --------- | --------- | ----------------------------------------- |
| bucket_ts | string    | Bucket timestamp (ISO 8601 format)        |
| apy       | string    | Annualized percentage yield at this point |

### Open Interest

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "open_interest",
  id: 123,
  params: null,
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "long_exposure": "1250000.50",
    "short_exposure": "980000.25",
    "last_order_timestamp": "2024-02-27T15:30:00Z"
  },
  "id": 123
}
```

**Description:** Returns the current open interest data including long and short exposure (computed as initial_margin * leverage for active filled orders), along with the most recent order timestamp.

**Use Cases:**

- Market-wide exposure analysis for risk monitoring and trend confirmation
- Long/short ratio calculation for sentiment analysis
- Liquidity and depth assessment for large position planning
- Open interest trend tracking for trading signal generation
- Market capacity and utilization monitoring

Open Interest

### HTTP Method

`POST`

### RPC Method

`open_interest`

### Message Parameters

| Params | Data_Type | Values                 |
| ------ | --------- | ---------------------- |
| N/A    | null      | No parameters required |

### Response Fields

| Field                | Data_Type | Description                                  |
| -------------------- | --------- | -------------------------------------------- |
| long_exposure        | string    | Total long exposure (margin * leverage)      |
| short_exposure       | string    | Total short exposure (margin * leverage)     |
| last_order_timestamp | string    | Timestamp of last order (ISO 8601, nullable) |

### Market Stats

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "get_market_stats",
  id: 123,
  params: null,
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "pool_equity_btc": 10.5,
    "total_long_btc": 3.2,
    "total_short_btc": 2.8,
    "total_pending_long_btc": 0.5,
    "total_pending_short_btc": 0.3,
    "open_interest_btc": 6.0,
    "net_exposure_btc": 0.4,
    "long_pct": 0.5333,
    "short_pct": 0.4667,
    "utilization": 0.5714,
    "max_long_btc": 2.5,
    "max_short_btc": 2.9,
    "status": "HEALTHY",
    "status_reason": null,
    "params": {
      "max_oi_mult": 4.0,
      "max_net_mult": 0.8,
      "max_position_pct": 0.02,
      "min_position_btc": 0.0,
      "max_leverage": 50.0,
      "mm_ratio": 0.4
    }
  },
  "id": 123
}
```

**Description:** Returns comprehensive market risk statistics computed from the cached RiskState (Redis) and lending pool equity. Includes open interest, net exposure, utilization ratio, maximum allowed position sizes, and market status (HEALTHY, CLOSE_ONLY, or HALT).

**Use Cases:**

- Real-time market health monitoring and circuit breaker status checks
- Risk limit calculations for position sizing and order validation
- Market utilization and capacity analysis for trading decisions
- Long/short balance tracking and net exposure monitoring
- Automated trading system integration for risk-aware order routing

Market Stats

### HTTP Method

`POST`

### RPC Method

`get_market_stats`

### Message Parameters

| Params | Data_Type | Values                 |
| ------ | --------- | ---------------------- |
| N/A    | null      | No parameters required |

### Response Fields

| Field                   | Data_Type | Description                                                                              |
| ----------------------- | --------- | ---------------------------------------------------------------------------------------- |
| pool_equity_btc         | number    | Total pool equity in BTC                                                                 |
| total_long_btc          | number    | Total long positions in BTC                                                              |
| total_short_btc         | number    | Total short positions in BTC                                                             |
| total_pending_long_btc  | number    | Total pending long positions in BTC                                                      |
| total_pending_short_btc | number    | Total pending short positions in BTC                                                     |
| open_interest_btc       | number    | Total open interest (long + short) in BTC                                                |
| net_exposure_btc        | number    | Net exposure (long - short) in BTC                                                       |
| long_pct                | number    | Percentage of OI that is long (0-1)                                                      |
| short_pct               | number    | Percentage of OI that is short (0-1)                                                     |
| utilization             | number    | OI / pool equity ratio (0-1)                                                             |
| max_long_btc            | number    | Maximum additional long position allowed in BTC                                          |
| max_short_btc           | number    | Maximum additional short position allowed in BTC                                         |
| status                  | string    | Market status: `"HEALTHY"`, `"CLOSE_ONLY"`, or `"HALT"`                                 |
| status_reason           | string    | Reason for non-healthy status (nullable). E.g. `"MANUAL_HALT"`, `"POOL_EQUITY_INVALID"` |
| params                  | object    | Risk parameters object (see below)                                                       |

_Risk params object:_

| Field            | Data_Type | Description                                          |
| ---------------- | --------- | ---------------------------------------------------- |
| max_oi_mult      | number    | Maximum OI multiplier relative to pool equity        |
| max_net_mult     | number    | Maximum net exposure multiplier relative to pool     |
| max_position_pct | number    | Maximum single position as percentage of pool equity |
| min_position_btc | number    | Minimum position size in BTC                         |
| max_leverage     | number    | Maximum allowed leverage                             |
| mm_ratio         | number    | Maintenance margin ratio                             |

## Account Analytics

### Account Summary by Twilight Address

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "account_summary_by_twilight_address",
  id: 123,
  params: {
    t_address: "twilight1abc123...",
    from: "2024-01-01T00:00:00Z",
    to: "2024-02-01T00:00:00Z",
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-02-01T00:00:00Z",
    "settled_positionsize": "5000000",
    "filled_positionsize": "12000000",
    "liquidated_positionsize": "500000",
    "settled_count": 3,
    "filled_count": 8,
    "liquidated_count": 1
  },
  "id": 123
}
```

**Description:** Returns a trading activity summary for a specific Twilight address, including aggregated position sizes and order counts by status (settled, filled, liquidated). Dates must be at least 7 days in the past (configurable via `MAX_DELAYED_DAYS`).

**Use Cases:**

- Individual account performance analysis and trade history summary
- Risk monitoring for specific trader addresses
- Compliance reporting per address for regulatory requirements
- Portfolio analytics and P&L attribution by account
- Automated account health scoring and risk assessment

Account Summary by Twilight Address

### HTTP Method

`POST`

### RPC Method

`account_summary_by_twilight_address`

### Message Parameters

| Params    | Data_Type | Values                                                                    |
| --------- | --------- | ------------------------------------------------------------------------- |
| t_address | string    | Twilight address to query                                                 |
| from      | datetime  | (Optional) Start time (ISO 8601). Must be >= 7 days in the past          |
| to        | datetime  | (Optional) End time (ISO 8601). Capped to 7 days ago if in recent range  |
| since     | datetime  | (Optional) Alternative to from/to. Must be >= 7 days in the past         |

_Note: Either `since` or `from` must be provided. `to` cannot be provided without `from`._

### Response Fields

| Field                   | Data_Type | Description                                  |
| ----------------------- | --------- | -------------------------------------------- |
| from                    | string    | Effective start time (ISO 8601)              |
| to                      | string    | Effective end time (ISO 8601)                |
| settled_positionsize    | string    | Total position size of settled orders        |
| filled_positionsize     | string    | Total position size of filled orders         |
| liquidated_positionsize | string    | Total position size of liquidated orders     |
| settled_count           | integer   | Number of settled orders                     |
| filled_count            | integer   | Number of filled orders                      |
| liquidated_count        | integer   | Number of liquidated orders                  |

### All Account Summaries

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "all_account_summaries",
  id: 123,
  params: {
    from: "2024-01-01T00:00:00Z",
    to: "2024-02-01T00:00:00Z",
    limit: 50,
    offset: 0,
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "from": "2024-01-01T00:00:00Z",
    "to": "2024-02-01T00:00:00Z",
    "limit": 50,
    "offset": 0,
    "summaries": [
      {
        "twilight_address": "twilight1abc123...",
        "settled_positionsize": "5000000",
        "filled_positionsize": "12000000",
        "liquidated_positionsize": "500000",
        "settled_count": 3,
        "filled_count": 8,
        "liquidated_count": 1
      }
    ]
  },
  "id": 123
}
```

**Description:** Returns paginated trading activity summaries for all Twilight addresses within a time range. Dates must be at least 7 days in the past. Supports pagination with configurable limit (max 500) and offset.

**Use Cases:**

- Platform-wide trading activity reporting and analytics
- Leaderboard generation based on trading volume or performance
- Compliance and regulatory reporting across all accounts
- Market-wide risk assessment and aggregate position monitoring
- Business intelligence and user engagement analytics

All Account Summaries

### HTTP Method

`POST`

### RPC Method

`all_account_summaries`

### Message Parameters

| Params | Data_Type | Values                                                                    |
| ------ | --------- | ------------------------------------------------------------------------- |
| from   | datetime  | (Optional) Start time (ISO 8601). Must be >= 7 days in the past          |
| to     | datetime  | (Optional) End time (ISO 8601). Capped to 7 days ago if in recent range  |
| since  | datetime  | (Optional) Alternative to from/to. Must be >= 7 days in the past         |
| limit  | integer   | (Optional) Number of results per page (1-500, default 50)                 |
| offset | integer   | (Optional) Page offset (default 0)                                        |

_Note: Either `since` or `from` must be provided. `to` cannot be provided without `from`._

### Response Fields

| Field     | Data_Type | Description                              |
| --------- | --------- | ---------------------------------------- |
| from      | string    | Effective start time (ISO 8601)          |
| to        | string    | Effective end time (ISO 8601)            |
| limit     | integer   | Applied page limit                       |
| offset    | integer   | Applied page offset                      |
| summaries | array     | Array of account summary objects         |

_Each summary object:_

| Field                   | Data_Type | Description                              |
| ----------------------- | --------- | ---------------------------------------- |
| twilight_address        | string    | Twilight address                         |
| settled_positionsize    | string    | Total position size of settled orders    |
| filled_positionsize     | string    | Total position size of filled orders     |
| liquidated_positionsize | string    | Total position size of liquidated orders |
| settled_count           | integer   | Number of settled orders                 |
| filled_count            | integer   | Number of filled orders                  |
| liquidated_count        | integer   | Number of liquidated orders              |

## System Information

### Server Time

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "server_time",
  id: 123,
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": "2024-01-31T11:05:37.546616309Z",
  "id": 123
}
```

**Description:** Returns the current server timestamp for time synchronization and ensuring accurate order timestamping.

**Use Cases:**

- Client-server time synchronization for accurate order placement
- Timestamp validation for API requests and signature generation
- Latency measurement and network performance monitoring
- Event sequencing and order book consistency verification
- Audit trail and compliance logging with accurate timestamps

Server time

### HTTP Method

`POST`

### RPC Method

`server_time`

### Message Parameters

| Params | Data_Type | Values                 |
| ------ | --------- | ---------------------- |
| N/A    | null      | No parameters required |

### Response Fields

| Field  | Data_Type | Description                                |
| ------ | --------- | ------------------------------------------ |
| result | string    | Current server timestamp (ISO 8601 format) |

---

# Order API

The Order API handles order management, chain operations, and trading activities. These endpoints may require authentication and are designed for active trading operations.

## Authentication

### Login

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  account_address: "twilight1l03j8j5nwegy9fkz9p0whkxch2e2zqcq6lvfda",
  data: "hello",
  signature: {
    pub_key: {
      type: "tendermint/PubKeySecp256k1",
      value: "AkNImdlt3/+4axILXJsyiBigMWheg8i8npwTX/AzBrSC",
    },
    signature:
      "waaVXJnXIYQd2BG4rVA12q5OTuctzcDt7BLyHw7Yx/1b2iDFrl4kOcC/VlvE3tvLZq7Dd/qSiMEdYK1DvDPmZw==",
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/register", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "api_key": "7d4fd427-ab9f-4a4d-8163-7faddb0c50e2",
  "api_secret": "dab81c56-2cb1-4bfb-b58d-26e14d1262d6"
}
```

**Description:** Authentication endpoint that generates API credentials for accessing private trading and account management functions.

**Use Cases:**

- Initial user registration and API access setup
- Credential renewal and security key rotation
- Multi-application access management for trading platforms
- Third-party integration and automated trading system setup
- Secure API access for institutional trading accounts

Endpoint to get `api_key` and `api_secret` for private API endpoints.

### HTTP Method

`POST`

### Message Body

| Params          | Data_Type | Values                                                                                      |
| --------------- | --------- | ------------------------------------------------------------------------------------------- |
| account_address | string    | Twilight address                                                                            |
| data            | string    | Message string                                                                              |
| signature       | object    | `{"pub_key": {"type": "tendermint/PubKeySecp256k1", "value": string}, "signature": string}` |

### Response Fields

| Field      | Data_Type | Description                                           |
| ---------- | --------- | ----------------------------------------------------- |
| api_key    | string    | Generated API key for accessing private endpoints     |
| api_secret | string    | Generated API secret for request signature generation |

<aside class="notice">
You must add <code>api_key</code> and <code>api_secret</code> in your private API endpoint header.
</aside>

## Order Management

### Submit Trade Order

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "submit_trade_order",
  id: 123,
  params: {
    data: "hex_encoded_transaction_data",
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "message": "Order request submitted successfully",
    "id": "unique_request_id"
  },
  "id": 123
}
```

**Description:** Submits a new perpetual contract trading order to the Relayer-matchbook orderbook. The hex-encoded data contains a serialized `CreateTraderOrderClientZkos` struct with ZK proof data and order parameters.

**Use Cases:**

- Direct order placement for manual and algorithmic trading strategies
- High-frequency trading and automated market making operations
- Portfolio rebalancing and risk management order execution
- Strategic position building and liquidation for institutional trading
- Integration with trading bots and automated trading systems

Submit a new trade order to the Relayer-matchbook

### HTTP Method

`POST`

### RPC Method

`submit_trade_order`

### Message Parameters

| Params | Data_Type | Values                                           |
| ------ | --------- | ------------------------------------------------ |
| data   | string    | Hex-encoded transaction data for the trade order |

### Response Fields

| Field   | Data_Type | Description                                     |
| ------- | --------- | ----------------------------------------------- |
| message | string    | Success message confirming order submission     |
| id      | string    | Unique request identifier for tracking purposes |

### Submit Lend Order

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "submit_lend_order",
  id: 123,
  params: {
    data: "hex_encoded_transaction_data",
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "message": "Order request submitted successfully",
    "id": "unique_request_id"
  },
  "id": 123
}
```

**Description:** Submits a new lending order to participate in the lending pool and earn yield on deposited assets. The hex-encoded data contains a serialized `CreateLendOrderZkos` struct.

**Use Cases:**

- Yield farming and passive income generation through lending strategies
- Liquidity provision to support margin trading and leverage operations
- Portfolio diversification with DeFi lending products and fixed-income alternatives
- Capital allocation optimization for unused trading capital
- Automated lending strategies and rebalancing for institutional accounts

Submit a new lend order to the lending pool

### HTTP Method

`POST`

### RPC Method

`submit_lend_order`

### Message Parameters

| Params | Data_Type | Values                                          |
| ------ | --------- | ----------------------------------------------- |
| data   | string    | Hex-encoded transaction data for the lend order |

### Response Fields

| Field   | Data_Type | Description                                     |
| ------- | --------- | ----------------------------------------------- |
| message | string    | Success message confirming order submission     |
| id      | string    | Unique request identifier for tracking purposes |

### Settle Trade Order

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "settle_trade_order",
  id: 123,
  params: {
    data: "hex_encoded_settlement_data",
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "message": "Order request submitted successfully",
    "id": "unique_request_id"
  },
  "id": 123
}
```

**Description:** Executes the settlement process for filled trade orders, finalizing the trade and updating account balances. The hex-encoded data contains a serialized `ExecuteTraderOrderZkos` struct.

**Use Cases:**

- Order finalization and trade confirmation for executed positions
- Settlement timing optimization for tax and accounting purposes
- Automated settlement workflows for algorithmic trading systems
- Risk management through controlled settlement processes
- Compliance and audit trail maintenance for trade settlement records

Settle an existing trade order

### HTTP Method

`POST`

### RPC Method

`settle_trade_order`

### Message Parameters

| Params | Data_Type | Values                                          |
| ------ | --------- | ----------------------------------------------- |
| data   | string    | Hex-encoded settlement data for the trade order |

### Response Fields

| Field   | Data_Type | Description                                     |
| ------- | --------- | ----------------------------------------------- |
| message | string    | Success message confirming order settlement     |
| id      | string    | Unique request identifier for tracking purposes |

### Settle Lend Order

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "settle_lend_order",
  id: 123,
  params: {
    data: "hex_encoded_settlement_data",
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "message": "Order request submitted successfully",
    "id": "unique_request_id"
  },
  "id": 123
}
```

**Description:** Executes the settlement process for lending orders, finalizing the lending position and updating pool shares. The hex-encoded data contains a serialized `ExecuteLendOrderZkos` struct.

**Use Cases:**

- Lending position finalization and yield calculation confirmation
- Withdrawal processing and capital reallocation for lending strategies
- Automated settlement for DeFi lending and yield optimization protocols
- Pool share reconciliation and accurate yield distribution
- Compliance reporting for lending income and tax calculation purposes

Settle an existing lend order

### HTTP Method

`POST`

### RPC Method

`settle_lend_order`

### Message Parameters

| Params | Data_Type | Values                                         |
| ------ | --------- | ---------------------------------------------- |
| data   | string    | Hex-encoded settlement data for the lend order |

### Response Fields

| Field   | Data_Type | Description                                     |
| ------- | --------- | ----------------------------------------------- |
| message | string    | Success message confirming order settlement     |
| id      | string    | Unique request identifier for tracking purposes |

### Cancel Trader Order

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "cancel_trader_order",
  id: 123,
  params: {
    data: "hex_encoded_cancellation_data",
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "message": "Order request submitted successfully",
    "id": "unique_request_id"
  },
  "id": 123
}
```

**Description:** Cancels an existing unfilled or partially filled trading order, removing it from the orderbook. The hex-encoded data contains a serialized `CancelTraderOrderZkos` struct. Only orders with a cancelable status can be cancelled.

**Use Cases:**

- Risk management through rapid order cancellation during market volatility
- Strategy adjustment and order modification for changing market conditions
- Automated order management and stop-loss implementation for trading algorithms
- Position size adjustment and order replacement for optimal execution
- Emergency order cancellation and risk mitigation during system issues

Cancel an existing trader order

### HTTP Method

`POST`

### RPC Method

`cancel_trader_order`

### Message Parameters

| Params | Data_Type | Values                                             |
| ------ | --------- | -------------------------------------------------- |
| data   | string    | Hex-encoded cancellation data for the trader order |

### Response Fields

| Field   | Data_Type | Description                                     |
| ------- | --------- | ----------------------------------------------- |
| message | string    | Success message confirming order cancellation   |
| id      | string    | Unique request identifier for tracking purposes |

## Order Information & Chain Data

### Trader Order Info

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "trader_order_info",
  id: 123,
  params: {
    data: "hex_encoded_data_string",
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "id": 50,
    "uuid": "3374714d-8a95-4096-855f-7e2675fe0dc8",
    "account_id": "0c08ed4f0daeec9b...",
    "position_type": "LONG",
    "order_status": "FILLED",
    "order_type": "MARKET",
    "entryprice": "42508.71",
    "execution_price": "30000",
    "positionsize": "4250871",
    "leverage": "10",
    "initial_margin": "10",
    "available_margin": "10",
    "timestamp": "2024-01-31T11:14:45.575359Z",
    "bankruptcy_price": "38644.28",
    "bankruptcy_value": "110",
    "maintenance_margin": "0.5375",
    "liquidation_price": "38834.04",
    "unrealized_pnl": "0",
    "settlement_price": "0",
    "entry_nonce": 0,
    "exit_nonce": 0,
    "entry_sequence": 1,
    "fee_filled": "0",
    "fee_settled": "0"
  },
  "id": 123
}
```

**Description:** Retrieves the latest trader order for an account using encrypted account data (hex-encoded `QueryTraderOrderZkos`). The request is verified via `verify_query_order` before querying the database.

**Use Cases:**

- Order status verification and execution confirmation for specific traders
- Risk management and position monitoring for trading algorithms
- Compliance monitoring and audit trail verification for regulatory purposes
- Portfolio management and performance tracking for individual accounts
- Customer service and order dispute resolution with privacy protection

Get trader order information by account ID

### HTTP Method

`POST`

### RPC Method

`trader_order_info`

### Message Parameters

| Params | Data_Type | Values                                  |
| ------ | --------- | --------------------------------------- |
| data   | string    | Hex-encoded query data for trader order |

### Response Fields

| Field              | Data_Type | Description                                       |
| ------------------ | --------- | ------------------------------------------------- |
| id                 | integer   | Internal order ID                                 |
| uuid               | string    | Unique order identifier                           |
| account_id         | string    | Account public key associated with the order      |
| position_type      | string    | Position direction (`"LONG"` or `"SHORT"`)        |
| order_status       | string    | Current order status (`"FILLED"`, `"PENDING"`, `"CANCELLED"`, `"SETTLED"`, `"LIQUIDATE"`) |
| order_type         | string    | Order type (`"MARKET"`, `"LIMIT"`)                |
| entryprice         | string    | Entry price for the position                      |
| execution_price    | string    | Actual execution price                            |
| positionsize       | string    | Position size in base currency                    |
| leverage           | string    | Leverage multiplier                               |
| initial_margin     | string    | Initial margin requirement                        |
| available_margin   | string    | Available margin for the position                 |
| timestamp          | string    | Order creation timestamp (ISO 8601 format)        |
| bankruptcy_price   | string    | Price at which position becomes bankrupt          |
| bankruptcy_value   | string    | Value at bankruptcy price                         |
| maintenance_margin | string    | Maintenance margin requirement                    |
| liquidation_price  | string    | Price at which position gets liquidated           |
| unrealized_pnl     | string    | Current unrealized profit/loss                    |
| settlement_price   | string    | Settlement price if order is settled              |
| entry_nonce        | integer   | Entry transaction nonce                           |
| exit_nonce         | integer   | Exit transaction nonce                            |
| entry_sequence     | integer   | Entry sequence number                             |
| fee_filled         | string    | Fee paid when order was filled                    |
| fee_settled        | string    | Fee paid when order was settled                   |

### Trader Order Info V1

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "trader_order_info_v1",
  id: 123,
  params: {
    data: "hex_encoded_data_string",
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "id": 50,
    "uuid": "3374714d-8a95-4096-855f-7e2675fe0dc8",
    "account_id": "0c08ed4f0daeec9b...",
    "position_type": "LONG",
    "order_status": "FILLED",
    "order_type": "MARKET",
    "entryprice": "42508.71",
    "execution_price": "30000",
    "positionsize": "4250871",
    "leverage": "10",
    "initial_margin": "10",
    "available_margin": "10",
    "timestamp": "2024-01-31T11:14:45.575359Z",
    "bankruptcy_price": "38644.28",
    "bankruptcy_value": "110",
    "maintenance_margin": "0.5375",
    "liquidation_price": "38834.04",
    "unrealized_pnl": "0",
    "settlement_price": "0",
    "entry_nonce": 0,
    "exit_nonce": 0,
    "entry_sequence": 1,
    "fee_filled": "0",
    "fee_settled": "0",
    "settle_limit": {
      "uuid": "3374714d-8a95-4096-855f-7e2675fe0dc8",
      "position_type": "LONG",
      "price": "45000.00"
    },
    "funding_applied": "0.0025"
  },
  "id": 123
}
```

**Description:** Enhanced version of `trader_order_info` that includes additional fields: `settle_limit` (the latest close limit price for non-settled/non-liquidated orders) and `funding_applied` (the cumulative funding payment applied to the order, computed as `initial_margin - available_margin - fee_filled`).

**Use Cases:**

- Comprehensive order detail retrieval including pending settlement limits
- Funding cost analysis and tracking for active positions
- Advanced position management with close limit price visibility
- Detailed P&L breakdown including funding impact
- Risk assessment incorporating settlement limit prices

Get enhanced trader order information by account ID

### HTTP Method

`POST`

### RPC Method

`trader_order_info_v1`

### Message Parameters

| Params | Data_Type | Values                                  |
| ------ | --------- | --------------------------------------- |
| data   | string    | Hex-encoded query data for trader order |

### Response Fields

All fields from `trader_order_info` plus:

| Field           | Data_Type | Description                                                                 |
| --------------- | --------- | --------------------------------------------------------------------------- |
| settle_limit    | object    | Latest close limit details (null if settled/liquidated or no limit set)     |
| funding_applied | string    | Cumulative funding payment applied (null if no funding updates recorded)   |

_settle_limit object (when present):_

| Field         | Data_Type | Description                        |
| ------------- | --------- | ---------------------------------- |
| uuid          | string    | Order UUID                         |
| position_type | string    | Position direction                 |
| price         | string    | Close limit price                  |

### Lend Order Info

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "lend_order_info",
  id: 123,
  params: {
    data: "hex_encoded_data_string",
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "id": 25,
    "uuid": "6fb4f910-ceb4-432d-995b-79eddb8c4c83",
    "account_id": "0c08ed4f0daeec9b...",
    "balance": "153620",
    "order_status": "FILLED",
    "order_type": "MARKET",
    "entry_nonce": 0,
    "exit_nonce": 0,
    "deposit": "153620",
    "new_lend_state_amount": "153620",
    "timestamp": "2024-02-28T04:59:44.020048Z",
    "npoolshare": "100",
    "nwithdraw": "0",
    "payment": "0",
    "tlv0": "0",
    "tps0": "0",
    "tlv1": "0",
    "tps1": "0",
    "tlv2": "0",
    "tps2": "0",
    "tlv3": "0",
    "tps3": "0",
    "entry_sequence": 10
  },
  "id": 123
}
```

**Description:** Retrieves detailed lending order information using encrypted account data (hex-encoded `QueryLendOrderZkos`). The request is verified via `verify_query_order` before querying the database.

**Use Cases:**

- Lending position monitoring and yield tracking for DeFi strategies
- Pool share management and withdrawal planning for liquidity providers
- Performance analysis and ROI calculation for lending portfolios
- Risk assessment and exposure management for lending activities
- Compliance reporting and audit trail for lending operations

Get lend order information by account ID

### HTTP Method

`POST`

### RPC Method

`lend_order_info`

### Message Parameters

| Params | Data_Type | Values                                |
| ------ | --------- | ------------------------------------- |
| data   | string    | Hex-encoded query data for lend order |

### Response Fields

| Field                 | Data_Type | Description                                       |
| --------------------- | --------- | ------------------------------------------------- |
| id                    | integer   | Internal lend order ID                            |
| uuid                  | string    | Unique lend order identifier                      |
| account_id            | string    | Account public key associated with the lend order |
| balance               | string    | Current balance in the lend order                 |
| order_status          | string    | Current order status (`"FILLED"`, `"PENDING"`, `"CANCELLED"`, `"SETTLED"`) |
| order_type            | string    | Order type (`"MARKET"`, `"LIMIT"`)                |
| entry_nonce           | integer   | Entry transaction nonce                           |
| exit_nonce            | integer   | Exit transaction nonce                            |
| deposit               | string    | Initial deposit amount                            |
| new_lend_state_amount | string    | Updated lend state amount                         |
| timestamp             | string    | Order creation timestamp (ISO 8601 format)        |
| npoolshare            | string    | Number of pool shares                             |
| nwithdraw             | string    | Withdrawal amount                                 |
| payment               | string    | Payment amount                                    |
| tlv0                  | string    | Total locked value tier 0                         |
| tps0                  | string    | Total pool shares tier 0                          |
| tlv1                  | string    | Total locked value tier 1                         |
| tps1                  | string    | Total pool shares tier 1                          |
| tlv2                  | string    | Total locked value tier 2                         |
| tps2                  | string    | Total pool shares tier 2                          |
| tlv3                  | string    | Total locked value tier 3                         |
| tps3                  | string    | Total pool shares tier 3                          |
| entry_sequence        | integer   | Entry sequence number                             |

### Historical Trader Order Info

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "historical_trader_order_info",
  id: 123,
  params: {
    data: "hex_encoded_data_string",
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "id": 50,
      "uuid": "3374714d-8a95-4096-855f-7e2675fe0dc8",
      "account_id": "0c08ed4f0daeec9b...",
      "position_type": "LONG",
      "order_status": "SETTLED",
      "order_type": "MARKET",
      "entryprice": "42508.71",
      "execution_price": "30000",
      "positionsize": "4250871",
      "leverage": "10",
      "initial_margin": "10",
      "available_margin": "9.85",
      "timestamp": "2024-01-31T11:14:45.575359Z",
      "bankruptcy_price": "38644.28",
      "bankruptcy_value": "110",
      "maintenance_margin": "0.5375",
      "liquidation_price": "38834.04",
      "unrealized_pnl": "1.25",
      "settlement_price": "43500.00",
      "entry_nonce": 0,
      "exit_nonce": 1,
      "entry_sequence": 1,
      "fee_filled": "0.05",
      "fee_settled": "0.075"
    }
  ],
  "id": 123
}
```

**Description:** Retrieves the full history of trader orders for an account (up to 500 most recent). Uses the same hex-encoded `QueryTraderOrderZkos` format as `trader_order_info` but returns an array of all historical orders instead of just the latest.

**Use Cases:**

- Complete trading history retrieval for account analysis and record-keeping
- Historical performance analysis and trade pattern identification
- Compliance and audit trail for regulatory reporting requirements
- P&L attribution and risk analysis across all historical positions
- Account activity reconstruction for dispute resolution

Get historical trader order information by account ID

### HTTP Method

`POST`

### RPC Method

`historical_trader_order_info`

### Message Parameters

| Params | Data_Type | Values                                  |
| ------ | --------- | --------------------------------------- |
| data   | string    | Hex-encoded query data for trader order |

### Response Fields

Returns an array of trader order objects. Each object has the same fields as the `trader_order_info` response.

### Historical Lend Order Info

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "historical_lend_order_info",
  id: 123,
  params: {
    data: "hex_encoded_data_string",
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "id": 25,
      "uuid": "6fb4f910-ceb4-432d-995b-79eddb8c4c83",
      "account_id": "0c08ed4f0daeec9b...",
      "balance": "153620",
      "order_status": "SETTLED",
      "order_type": "MARKET",
      "entry_nonce": 0,
      "exit_nonce": 1,
      "deposit": "153620",
      "new_lend_state_amount": "155000",
      "timestamp": "2024-02-28T04:59:44.020048Z",
      "npoolshare": "100",
      "nwithdraw": "155000",
      "payment": "1380",
      "tlv0": "0",
      "tps0": "0",
      "tlv1": "0",
      "tps1": "0",
      "tlv2": "0",
      "tps2": "0",
      "tlv3": "0",
      "tps3": "0",
      "entry_sequence": 10
    }
  ],
  "id": 123
}
```

**Description:** Retrieves the full history of lending orders for an account. Uses the same hex-encoded `QueryLendOrderZkos` format as `lend_order_info` but returns an array of all historical orders.

**Use Cases:**

- Complete lending history for account analysis and yield tracking
- Historical performance review for lending strategy optimization
- Compliance and audit trail for lending operations reporting
- Pool share movement analysis and capital flow tracking
- Account activity reconstruction for dispute resolution

Get historical lend order information by account ID

### HTTP Method

`POST`

### RPC Method

`historical_lend_order_info`

### Message Parameters

| Params | Data_Type | Values                                |
| ------ | --------- | ------------------------------------- |
| data   | string    | Hex-encoded query data for lend order |

### Response Fields

Returns an array of lend order objects. Each object has the same fields as the `lend_order_info` response.

### Transaction Hashes

The `transaction_hashes` method supports three different parameter types for querying transaction data:

### 1. Query by Account ID

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "transaction_hashes",
  id: 123,
  params: {
    AccountId: {
      id: "0c3eb16783ccdbee855e0babf6d130101e7d66089bac20484606e52bf507d90e3a5049a3379b8afc47068d2508dfd71fe92adab7a5ad682fbbbb9b401158e62d42aa64cb22",
      status: "FILLED",
      limit: 100,
      offset: 0,
    },
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

### 2. Query by Transaction/Order ID

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "transaction_hashes",
  id: 123,
  params: {
    TxId: {
      id: "83216790-d1c6-40d9-a70e-712d5d81cecd",
      status: "SETTLED",
      limit: 100,
      offset: 0,
    },
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

### 3. Query by Request ID

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "transaction_hashes",
  id: 123,
  params: {
    RequestId: {
      id: "REQIDFCE62EB3F784D832BB59ABF8AD67D84DA502248B95B7F613F00820879478F325",
      status: "FILLED",
      limit: 100,
      offset: 0,
    },
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": [
    {
      "account_id": "0c3eb16783ccdbee...",
      "datetime": "1708363831398559",
      "id": 4,
      "order_id": "83216790-d1c6-40d9-a70e-712d5d81cecd",
      "order_status": "FILLED",
      "order_type": "MARKET",
      "output": "01000000...",
      "request_id": "REQIDFCE62EB3F784D832BB59ABF8AD67D84DA502248B95B7F613F00820879478F325",
      "tx_hash": "8E291447D61EBC7E0AF5BB006576190E117516CA9A29358554C108718586FF58"
    }
  ],
  "id": 123
}
```

**Description:** Retrieves blockchain transaction hashes and details for order execution verification and audit trail purposes. Supports querying by Account ID, Transaction/Order ID, or Request ID, with optional status filtering and pagination.

**Use Cases:**

- Transaction verification and blockchain confirmation tracking
- Audit trail maintenance for regulatory compliance and reporting
- Order execution transparency and proof of settlement
- Dispute resolution and transaction history verification
- Integration with blockchain explorers for transaction monitoring

Transaction Hashes

### HTTP Method

`POST`

### RPC Method

`transaction_hashes`

### Message Parameters

The `transaction_hashes` method accepts one of three parameter variants:

#### Variant 1: Query by Account ID

| Params           | Data_Type | Required | Values                                                                     |
| ---------------- | --------- | -------- | -------------------------------------------------------------------------- |
| AccountId.id     | string    | Yes      | Account public key/identifier                                              |
| AccountId.status | string    | No       | Optional order status filter (`"FILLED"`, `"SETTLED"`, `"PENDING"`, `"CANCELLED"`) |
| AccountId.limit  | integer   | No       | Number of results (default 500, max 500)                                   |
| AccountId.offset | integer   | No       | Page offset (default 0)                                                    |

#### Variant 2: Query by Transaction/Order ID

| Params      | Data_Type | Required | Values                                                                     |
| ----------- | --------- | -------- | -------------------------------------------------------------------------- |
| TxId.id     | string    | Yes      | Transaction/Order UUID                                                     |
| TxId.status | string    | No       | Optional order status filter (`"FILLED"`, `"SETTLED"`, `"PENDING"`, `"CANCELLED"`) |
| TxId.limit  | integer   | No       | Number of results (default 500, max 500)                                   |
| TxId.offset | integer   | No       | Page offset (default 0)                                                    |

#### Variant 3: Query by Request ID

| Params           | Data_Type | Required | Values                                                                     |
| ---------------- | --------- | -------- | -------------------------------------------------------------------------- |
| RequestId.id     | string    | Yes      | Unique request identifier                                                  |
| RequestId.status | string    | No       | Optional order status filter (`"FILLED"`, `"SETTLED"`, `"PENDING"`, `"CANCELLED"`) |
| RequestId.limit  | integer   | No       | Number of results (default 500, max 500)                                   |
| RequestId.offset | integer   | No       | Page offset (default 0)                                                    |

### Response Fields

| Field        | Data_Type | Description                                            |
| ------------ | --------- | ------------------------------------------------------ |
| id           | integer   | Internal transaction record ID                         |
| order_id     | string    | Order UUID associated with the transaction             |
| account_id   | string    | Account ID associated with the transaction             |
| tx_hash      | string    | Blockchain transaction hash                            |
| order_type   | string    | Order type (`"MARKET"`, `"LIMIT"`)                     |
| order_status | string    | Order status at transaction time                       |
| datetime     | string    | Transaction timestamp (Unix timestamp in microseconds) |
| output       | string    | Hex-encoded transaction output data (nullable)         |
| request_id   | string    | Unique request identifier (nullable)                   |
