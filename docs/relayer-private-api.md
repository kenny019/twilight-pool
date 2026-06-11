# Private API

**Endpoint URL**

`API_ENDPOINT_PRODUCTION = https://relayer.twilight.rest`

`API_ENDPOINT_STAGING = https://app.twilight.rest`

## Request Structure

All private API requests must be sent to:

**`API_ENDPOINT_PRIVATE/api`**

The private API runs on port `:8989`.

### Request Format

| Component    | Description                    |
| ------------ | ------------------------------ |
| URL          | `API_ENDPOINT_PRIVATE/api`     |
| Method       | `POST`                         |
| Content-Type | `application/json`             |
| Headers      | `api_key` and `api_secret`     |
| Body         | JSON-RPC 2.0 formatted request |

### Authentication

All private API requests require authentication headers:

| Header     | Description                                         |
| ---------- | --------------------------------------------------- |
| api_key    | API key obtained from the `/register` endpoint      |
| api_secret | API secret obtained from the `/register` endpoint   |

### Parameter Wrapper

All private API methods use the `RpcArgs<T>` wrapper format:

```json
{
  "jsonrpc": "2.0",
  "method": "method_name",
  "id": 123,
  "params": {
    "user": {
      "customer_id": 12345
    },
    "params": {
      // method-specific parameters
    }
  }
}
```

The `user` object contains the authenticated `customer_id`, and `params` contains the method-specific parameters.

---

## Authentication

### Login

For authentication and obtaining API credentials, see the Login section in the [Public API documentation](relayer-public-api.md#login).

Use the `/register` endpoint to obtain `api_key` and `api_secret` credentials.

---

## Order Management

### Submit Trade Order

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("api_key", "your_api_key");
myHeaders.append("api_secret", "your_api_secret");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "submit_trade_order",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: {
      data: "hex_encoded_transaction_data",
    },
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT_PRIVATE/api", requestOptions)
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

**Description:** Submits a new perpetual contract trading order via the authenticated private API. Similar to the public `submit_trade_order`, but requires authentication and links the order to the customer account via the `RpcArgs` wrapper. The hex-encoded data contains a serialized `CreateTraderOrderClientZkos` struct.

**Use Cases:**

- Authenticated order placement for account-linked trading
- Customer-specific order tracking and management
- Institutional trading with account-level attribution
- Automated trading systems with API key authentication
- High-frequency trading with authenticated access

Submit a new trade order (authenticated)

### HTTP Method

`POST`

### RPC Method

`submit_trade_order`

### Message Parameters

| Params          | Data_Type | Values                                           |
| --------------- | --------- | ------------------------------------------------ |
| user.customer_id | integer  | Authenticated customer ID                        |
| params.data     | string    | Hex-encoded transaction data for the trade order |

### Response Fields

| Field   | Data_Type | Description                                     |
| ------- | --------- | ----------------------------------------------- |
| message | string    | Success message confirming order submission     |
| id      | string    | Unique request identifier for tracking purposes |

### Submit Lend Order

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("api_key", "your_api_key");
myHeaders.append("api_secret", "your_api_secret");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "submit_lend_order",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: {
      data: "hex_encoded_transaction_data",
    },
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT_PRIVATE/api", requestOptions)
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

**Description:** Submits a new lending order via the authenticated private API. Links the lending order to the customer account and verifies the ZK proof before forwarding to Kafka. The hex-encoded data contains a serialized `CreateLendOrderZkos` struct.

**Use Cases:**

- Authenticated lending order placement with customer tracking
- Customer-linked yield farming and liquidity provision
- Institutional lending with account-level attribution
- Automated lending strategies with API key authentication
- Portfolio management across trading and lending activities

Submit a new lend order (authenticated)

### HTTP Method

`POST`

### RPC Method

`submit_lend_order`

### Message Parameters

| Params          | Data_Type | Values                                          |
| --------------- | --------- | ----------------------------------------------- |
| user.customer_id | integer  | Authenticated customer ID                       |
| params.data     | string    | Hex-encoded transaction data for the lend order |

### Response Fields

| Field   | Data_Type | Description                                     |
| ------- | --------- | ----------------------------------------------- |
| message | string    | Success message confirming order submission     |
| id      | string    | Unique request identifier for tracking purposes |

### Settle Trade Order

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("api_key", "your_api_key");
myHeaders.append("api_secret", "your_api_secret");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "settle_trade_order",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: {
      data: "hex_encoded_settlement_data",
    },
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT_PRIVATE/api", requestOptions)
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

**Description:** Executes the settlement process for filled trade orders via the authenticated private API. Verifies that the order belongs to the authenticated customer before proceeding with settlement. The hex-encoded data contains a serialized `ExecuteTraderOrderZkos` struct.

**Use Cases:**

- Authenticated order settlement with customer verification
- Account-specific settlement workflows for institutional traders
- Automated settlement systems with API key authentication
- Risk management with customer-level settlement controls
- Compliance-ready settlement with full audit trail

Settle an existing trade order (authenticated)

### HTTP Method

`POST`

### RPC Method

`settle_trade_order`

### Message Parameters

| Params          | Data_Type | Values                                          |
| --------------- | --------- | ----------------------------------------------- |
| user.customer_id | integer  | Authenticated customer ID                       |
| params.data     | string    | Hex-encoded settlement data for the trade order |

### Response Fields

| Field   | Data_Type | Description                                     |
| ------- | --------- | ----------------------------------------------- |
| message | string    | Success message confirming order settlement     |
| id      | string    | Unique request identifier for tracking purposes |

### Settle Lend Order

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("api_key", "your_api_key");
myHeaders.append("api_secret", "your_api_secret");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "settle_lend_order",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: {
      data: "hex_encoded_settlement_data",
    },
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT_PRIVATE/api", requestOptions)
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

**Description:** Executes the settlement process for lending orders via the authenticated private API. Verifies that the order belongs to the authenticated customer before proceeding. The hex-encoded data contains a serialized `ExecuteLendOrderZkos` struct.

**Use Cases:**

- Authenticated lending settlement with customer verification
- Withdrawal processing with account-level security
- Automated settlement for yield farming strategies
- Pool share reconciliation with customer-specific validation
- Compliance-ready lending settlement with audit trail

Settle an existing lend order (authenticated)

### HTTP Method

`POST`

### RPC Method

`settle_lend_order`

### Message Parameters

| Params          | Data_Type | Values                                         |
| --------------- | --------- | ---------------------------------------------- |
| user.customer_id | integer  | Authenticated customer ID                      |
| params.data     | string    | Hex-encoded settlement data for the lend order |

### Response Fields

| Field   | Data_Type | Description                                     |
| ------- | --------- | ----------------------------------------------- |
| message | string    | Success message confirming order settlement     |
| id      | string    | Unique request identifier for tracking purposes |

### Cancel Trader Order

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("api_key", "your_api_key");
myHeaders.append("api_secret", "your_api_secret");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "cancel_trader_order",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: {
      data: "hex_encoded_cancellation_data",
    },
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT_PRIVATE/api", requestOptions)
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

**Description:** Cancels an existing unfilled or partially filled trading order via the authenticated private API. Verifies customer ownership and that the order is in a cancelable state before proceeding. The hex-encoded data contains a serialized `CancelTraderOrderZkos` struct.

**Use Cases:**

- Authenticated order cancellation with customer verification
- Risk management through controlled order cancellation
- Automated order management for algorithmic trading
- Account-specific cancellation workflows for institutional traders
- Emergency order cancellation with authentication security

Cancel an existing trader order (authenticated)

### HTTP Method

`POST`

### RPC Method

`cancel_trader_order`

### Message Parameters

| Params          | Data_Type | Values                                             |
| --------------- | --------- | -------------------------------------------------- |
| user.customer_id | integer  | Authenticated customer ID                          |
| params.data     | string    | Hex-encoded cancellation data for the trader order |

### Response Fields

| Field   | Data_Type | Description                                     |
| ------- | --------- | ----------------------------------------------- |
| message | string    | Success message confirming order cancellation   |
| id      | string    | Unique request identifier for tracking purposes |

### Submit Bulk Order

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("api_key", "your_api_key");
myHeaders.append("api_secret", "your_api_secret");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "submit_bulk_order",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: [
      { data: "hex_encoded_order_1" },
      { data: "hex_encoded_order_2" },
      { data: "hex_encoded_order_3" },
    ],
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT_PRIVATE/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": "OK",
  "id": 123
}
```

**Description:** Submits multiple trading orders in a single request for batch processing. Currently returns `"OK"` as a placeholder. Full ZkOS bulk order support is planned for a future release.

**Use Cases:**

- High-frequency trading with batch order submission
- Market making strategies requiring simultaneous order placement
- Portfolio rebalancing with multiple order execution
- Grid trading and ladder order strategies
- Reduced API calls for multi-order trading workflows

Submit multiple trade orders in bulk (authenticated)

### HTTP Method

`POST`

### RPC Method

`submit_bulk_order`

### Message Parameters

| Params          | Data_Type | Values                                   |
| --------------- | --------- | ---------------------------------------- |
| user.customer_id | integer  | Authenticated customer ID                |
| params          | array     | Array of `Order` objects (`{ data: string }`) |

### Response Fields

| Field  | Data_Type | Description                    |
| ------ | --------- | ------------------------------ |
| result | string    | Confirmation string (`"OK"`)   |

---

## Account & Position Data

### Open Orders

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("api_key", "your_api_key");
myHeaders.append("api_secret", "your_api_secret");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "open_orders",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: {
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

fetch("API_ENDPOINT_PRIVATE/api", requestOptions)
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
    }
  ],
  "id": 123
}
```

**Description:** Returns all open (PENDING or FILLED) trader orders for the authenticated customer. Retrieves the latest state of each order by UUID, filtered to the customer's linked addresses. Supports pagination.

**Use Cases:**

- Active position monitoring and portfolio dashboard display
- Risk management and margin usage tracking for open positions
- Order management interface for manual trading platforms
- Automated position tracking for algorithmic trading systems
- Account-level exposure analysis and limit monitoring

Open orders for authenticated customer

### HTTP Method

`POST`

### RPC Method

`open_orders`

### Message Parameters

| Params          | Data_Type | Values                                     |
| --------------- | --------- | ------------------------------------------ |
| user.customer_id | integer  | Authenticated customer ID                  |
| params.limit    | integer   | (Optional) Number of results (1-500, default 500) |
| params.offset   | integer   | (Optional) Page offset (default 0)         |

_Note: `params` is optional. If omitted, default pagination applies._

### Response Fields

Returns an array of trader order objects. Each object has the same fields as the public `trader_order_info` response (see [Public API - Trader Order Info](relayer-public-api.md#trader-order-info)).

### Order History

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("api_key", "your_api_key");
myHeaders.append("api_secret", "your_api_secret");

// Variant 1: Query by Order ID
var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "order_history",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: {
      OrderId: "3374714d-8a95-4096-855f-7e2675fe0dc8",
    },
  },
});

// Variant 2: Query by Client ID (time range)
var raw2 = JSON.stringify({
  jsonrpc: "2.0",
  method: "order_history",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: {
      ClientId: {
        from: "2024-01-01T00:00:00Z",
        to: "2024-02-01T00:00:00Z",
        offset: 0,
        limit: 100,
      },
    },
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT_PRIVATE/api", requestOptions)
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

**Description:** Retrieves order history for the authenticated customer. Supports two query variants: by specific Order UUID (returns all state changes for that order, up to 500), or by Client ID with a time range (returns all orders in the period with pagination).

**Use Cases:**

- Complete order history for account analysis and record-keeping
- Trade performance tracking and P&L attribution
- Compliance and regulatory reporting for specific accounts
- Order lifecycle analysis (from pending to settled/cancelled)
- Historical trade review for strategy optimization

Order history for authenticated customer

### HTTP Method

`POST`

### RPC Method

`order_history`

### Message Parameters

The method accepts one of two parameter variants:

#### Variant 1: Query by Order ID

| Params          | Data_Type | Values                    |
| --------------- | --------- | ------------------------- |
| user.customer_id | integer  | Authenticated customer ID |
| params.OrderId  | string    | Order UUID to query       |

#### Variant 2: Query by Client ID (time range)

| Params               | Data_Type | Values                          |
| -------------------- | --------- | ------------------------------- |
| user.customer_id     | integer   | Authenticated customer ID       |
| params.ClientId.from | datetime  | Start time (ISO 8601)           |
| params.ClientId.to   | datetime  | End time (ISO 8601)             |
| params.ClientId.offset | integer | Page offset                     |
| params.ClientId.limit  | integer | Number of results (max 500)     |

### Response Fields

Returns an array of trader order objects. Each object has the same fields as the public `trader_order_info` response.

### Unrealized PnL

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("api_key", "your_api_key");
myHeaders.append("api_secret", "your_api_secret");

// Variant 1: By Order ID
var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "unrealized_pnl",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: {
      OrderId: "3374714d-8a95-4096-855f-7e2675fe0dc8",
    },
  },
});

// Variant 2: By Public Key
var raw2 = JSON.stringify({
  jsonrpc: "2.0",
  method: "unrealized_pnl",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: {
      PublicKey: "0c08ed4f0daeec9b...",
    },
  },
});

// Variant 3: All open positions
var raw3 = JSON.stringify({
  jsonrpc: "2.0",
  method: "unrealized_pnl",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: "All",
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT_PRIVATE/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "order_ids": [
      "3374714d-8a95-4096-855f-7e2675fe0dc8",
      "a2369fcf-489b-4ddf-85f6-78ec076401d0"
    ],
    "pnl": 2.5678
  },
  "id": 123
}
```

**Description:** Calculates unrealized profit/loss for the authenticated customer's open positions. Supports three query modes: by specific Order ID, by Public Key (all active orders for that key), or All (all active orders across all linked addresses). PnL is computed against the current BTC-USD price. Only non-closed orders (excluding PENDING, CANCELLED, LIQUIDATE, SETTLED) are included.

**Use Cases:**

- Real-time P&L monitoring for active trading positions
- Portfolio-wide unrealized P&L calculation for risk management
- Per-position P&L tracking for performance attribution
- Automated risk alerts based on P&L thresholds
- Account valuation and margin health monitoring

Unrealized PnL for authenticated customer

### HTTP Method

`POST`

### RPC Method

`unrealized_pnl`

### Message Parameters

The method accepts one of three parameter variants:

#### Variant 1: By Order ID

| Params          | Data_Type | Values                    |
| --------------- | --------- | ------------------------- |
| user.customer_id | integer  | Authenticated customer ID |
| params.OrderId  | string    | Specific order UUID       |

#### Variant 2: By Public Key

| Params            | Data_Type | Values                      |
| ----------------- | --------- | --------------------------- |
| user.customer_id  | integer   | Authenticated customer ID   |
| params.PublicKey  | string    | Account public key          |

#### Variant 3: All

| Params          | Data_Type | Values                    |
| --------------- | --------- | ------------------------- |
| user.customer_id | integer  | Authenticated customer ID |
| params          | string    | `"All"`                   |

### Response Fields

| Field     | Data_Type | Description                                 |
| --------- | --------- | ------------------------------------------- |
| order_ids | array     | Array of order UUIDs included in PnL calc   |
| pnl       | number    | Total unrealized PnL (floating point)       |

### Trade Volume

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("api_key", "your_api_key");
myHeaders.append("api_secret", "your_api_secret");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "trade_volume",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: {
      start: "2024-01-01T00:00:00Z",
      end: "2024-02-01T00:00:00Z",
    },
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT_PRIVATE/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": 125000000.50,
  "id": 123
}
```

**Description:** Returns the total trading volume (sum of position sizes) for the authenticated customer within a specified time range. Computes volume from the latest state of each unique order.

**Use Cases:**

- Trading volume tracking for fee tier calculation
- Performance metrics and activity monitoring for traders
- Compliance reporting for volume-based regulatory requirements
- Leaderboard and rewards program participation tracking
- Account activity analysis for risk assessment

Trade volume for authenticated customer

### HTTP Method

`POST`

### RPC Method

`trade_volume`

### Message Parameters

| Params          | Data_Type | Values                    |
| --------------- | --------- | ------------------------- |
| user.customer_id | integer  | Authenticated customer ID |
| params.start    | datetime  | Start time (ISO 8601)     |
| params.end      | datetime  | End time (ISO 8601)       |

### Response Fields

| Field  | Data_Type | Description                         |
| ------ | --------- | ----------------------------------- |
| result | number    | Total trading volume in the period  |

### Last Order Detail

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("api_key", "your_api_key");
myHeaders.append("api_secret", "your_api_secret");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "last_order_detail",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: null,
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT_PRIVATE/api", requestOptions)
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

**Description:** Returns the most recent trader order for the authenticated customer, ordered by timestamp descending. Useful for quick access to the latest order state without knowing the order UUID.

**Use Cases:**

- Quick last-order verification after order submission
- Trading confirmation display in user interfaces
- Automated post-trade processing and validation
- Account activity monitoring for the most recent action
- Debugging and support for recent order issues

Last order detail for authenticated customer

### HTTP Method

`POST`

### RPC Method

`last_order_detail`

### Message Parameters

| Params          | Data_Type | Values                    |
| --------------- | --------- | ------------------------- |
| user.customer_id | integer  | Authenticated customer ID |
| params          | null      | No additional parameters  |

### Response Fields

Returns a single trader order object with the same fields as the public `trader_order_info` response (see [Public API - Trader Order Info](relayer-public-api.md#trader-order-info)).

### Get Funding Payment

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("api_key", "your_api_key");
myHeaders.append("api_secret", "your_api_secret");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "get_funding_payment",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: {
      id: "3374714d-8a95-4096-855f-7e2675fe0dc8",
    },
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT_PRIVATE/api", requestOptions)
  .then((response) => response.text())
  .then((result) => console.log(result))
  .catch((error) => console.log("error", error));
```

> The result from the above endpoint looks like this:

```json
{
  "jsonrpc": "2.0",
  "result": {
    "order_id": "3374714d-8a95-4096-855f-7e2675fe0dc8",
    "funding_rate": "0.125",
    "price": "42643.99",
    "funding_payment": "0.0025"
  },
  "id": 123
}
```

**Description:** Retrieves the funding payment details for a specific order belonging to the authenticated customer. Returns the latest funding rate, the BTC-USD price at funding time, and the computed funding payment (difference between consecutive available_margin values).

**Use Cases:**

- Funding cost tracking for individual positions
- P&L breakdown including funding impact analysis
- Position cost optimization based on funding payments
- Compliance reporting for funding-related income/expenses
- Risk management with funding payment visibility

Funding payment for a specific order

### HTTP Method

`POST`

### RPC Method

`get_funding_payment`

### Message Parameters

| Params          | Data_Type | Values                    |
| --------------- | --------- | ------------------------- |
| user.customer_id | integer  | Authenticated customer ID |
| params.id       | string    | Order UUID to query       |

### Response Fields

| Field           | Data_Type | Description                            |
| --------------- | --------- | -------------------------------------- |
| order_id        | string    | Order UUID                             |
| funding_rate    | string    | Latest funding rate                    |
| price           | string    | BTC-USD price at funding time          |
| funding_payment | string    | Computed funding payment for the order |

---

## Order Information

### Trader Order Info

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("api_key", "your_api_key");
myHeaders.append("api_secret", "your_api_secret");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "trader_order_info",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: {
      id: "3374714d-8a95-4096-855f-7e2675fe0dc8",
    },
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT_PRIVATE/api", requestOptions)
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

**Description:** Retrieves trader order details by order UUID for the authenticated customer. Unlike the public `trader_order_info` which uses hex-encoded ZK proof data, the private version uses a simple order UUID and verifies the order belongs to the customer's linked addresses.

**Use Cases:**

- Quick order lookup by UUID for authenticated users
- Order status verification without ZK proof overhead
- Customer-specific order detail retrieval for trading interfaces
- Account management and order monitoring dashboards
- Support and dispute resolution with account-level verification

Get trader order information by UUID (authenticated)

### HTTP Method

`POST`

### RPC Method

`trader_order_info`

### Message Parameters

| Params          | Data_Type | Values                    |
| --------------- | --------- | ------------------------- |
| user.customer_id | integer  | Authenticated customer ID |
| params.id       | string    | Order UUID to query       |

### Response Fields

Returns a trader order object with the same fields as the public `trader_order_info` response (see [Public API - Trader Order Info](relayer-public-api.md#trader-order-info)).

### Lend Order Info

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("api_key", "your_api_key");
myHeaders.append("api_secret", "your_api_secret");

var raw = JSON.stringify({
  jsonrpc: "2.0",
  method: "lend_order_info",
  id: 123,
  params: {
    user: { customer_id: 12345 },
    params: {
      id: "6fb4f910-ceb4-432d-995b-79eddb8c4c83",
    },
  },
});

var requestOptions = {
  method: "POST",
  headers: myHeaders,
  body: raw,
  redirect: "follow",
};

fetch("API_ENDPOINT_PRIVATE/api", requestOptions)
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

**Description:** Retrieves lending order details by order UUID for the authenticated customer. Unlike the public `lend_order_info` which uses hex-encoded ZK proof data, the private version uses a simple order UUID and verifies the order belongs to the customer.

**Use Cases:**

- Quick lending order lookup by UUID for authenticated users
- Lending position monitoring without ZK proof overhead
- Customer-specific lending order detail retrieval
- Account management and lending dashboard display
- Support and dispute resolution with account-level verification

Get lend order information by UUID (authenticated)

### HTTP Method

`POST`

### RPC Method

`lend_order_info`

### Message Parameters

| Params          | Data_Type | Values                    |
| --------------- | --------- | ------------------------- |
| user.customer_id | integer  | Authenticated customer ID |
| params.id       | string    | Order UUID to query       |

### Response Fields

Returns a lend order object with the same fields as the public `lend_order_info` response (see [Public API - Lend Order Info](relayer-public-api.md#lend-order-info)).

---

## Pool Data

### Lend Pool Info

```javascript
var myHeaders = new Headers();
myHeaders.append("Content-Type", "application/json");
myHeaders.append("api_key", "your_api_key");
myHeaders.append("api_secret", "your_api_secret");

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

fetch("API_ENDPOINT_PRIVATE/api", requestOptions)
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

**Description:** Returns complete lending pool information. This is functionally identical to the public `lend_pool_info` endpoint but is available on the private API port for convenience.

**Use Cases:**

- Pool health monitoring from authenticated trading applications
- Internal pool data access for account management workflows
- Lending strategy decision support with authenticated context
- Combined trading and lending dashboard data retrieval
- Backend system integration for pool state monitoring

Lend pool info (authenticated)

### HTTP Method

`POST`

### RPC Method

`lend_pool_info`

### Message Parameters

| Params | Data_Type | Values                 |
| ------ | --------- | ---------------------- |
| N/A    | null      | No parameters required |

### Response Fields

Same as the public `lend_pool_info` response (see [Public API - Lend Pool Info](relayer-public-api.md#lend-pool-info)).
