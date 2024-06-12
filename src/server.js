const express = require("express");
const app = express();

app.use(express.json());

const TICKER = "TCS";

let users = [
  {
    id: "1", balances: {
      TCS: 10,
      INR: 50000
    }
  },
  {
    id: "2", balances: {
      TCS: 10,
      INR: 50000
    }
  }
];

const bids = [], asks = [];

app.get("/balance/:userId", (req, res) => {
  const userId = req.params.userId;
  const user = users.find((user) => user.id === userId);

  if (!user) {
    return res.json({
      balances: {
        INR: 0,
        [TICKER]: 0
      }
    });
  }

  res.json({ balances: user.balances });
});

app.post("/limit-order", (req, res) => {
  //console.log(req.body)
  let { side, price, quantity, userId } = req.body;
  price = Number(price);
  quantity = Number(quantity);
  const remainingQty = fillOrder(side, price, quantity, userId);

  if (remainingQty == 0) {
    return res.json({
      filledQty: quantity
    });
  }

  if (side == "bid") {
    bids.push({ userId, price, quantity: remainingQty });
    bids.sort((a, b) => a.price < b.price ? -1 : 1); // ascending order
  } else {
    asks.push({ userId, price, quantity: remainingQty });
    asks.sort((a, b) => a.price < b.price ? 1 : -1); // descending order
  }

  // console.log(bids);
  // console.log(asks);

  res.json({
    filledQty: quantity - remainingQty
  });
});

app.get("/depth", (req, res) => {
  const bid = {};
  const ask = {};
  for (let i = 0; i < bids.length; i++) {
    if (!bid[bids[i].price]) {
      bid[bids[i].price] = bids[i].quantity;
    } else {
      bid[bids[i].price] += bids[i].quantity;
    }
  }

  for (let i = 0; i < asks.length; i++) {
    if (!ask[asks[i].price]) {
      ask[asks[i].price] = asks[i].quantity;
    } else {
      ask[asks[i].price] += asks[i].quantity;
    }
  }

  res.json({ bid, ask });
});

function adjustBalance(userId1, userId2, quantity, price) {
  let user1 = users.find(x => x.id === userId1);
  let user2 = users.find(x => x.id === userId2);
  if (!user1 || !user2) {
    return;
  }
  user1.balances[TICKER] -= quantity;
  user2.balances[TICKER] += quantity;
  user1.balances["INR"] += (quantity * price);
  user2.balances["INR"] -= (quantity * price);
}

const fillOrder = (side, price, quantity, userId) => {
  //console.log(quantity);
  let remainingQuantity = quantity;
  if (side === "bid") {
    for (let i = asks.length - 1; i >= 0; i--) {
      if (asks[i].price > price) {
        continue;
      }
      if (asks[i].quantity > remainingQuantity) {
        asks[i].quantity -= remainingQuantity;
        adjustBalance(asks[i].userId, userId, remainingQuantity, asks[i].price);
        return 0;
      } else {
        remainingQuantity -= asks[i].quantity;
        adjustBalance(asks[i].userId, userId, asks[i].quantity, asks[i].price);
        asks.pop();
      }
    }
  } else {
    for (let i = bids.length - 1; i >= 0; i--) {
      if (bids[i].price < price) {
        continue;
      }
      if (bids[i].quantity > remainingQuantity) {
        bids[i].quantity -= remainingQuantity;
        adjustBalance(userId, bids[i].userId, remainingQuantity, price);
        return 0;
      } else {
        remainingQuantity -= bids[i].quantity;
        adjustBalance(userId, bids[i].userId, bids[i].quantity, price);
        bids.pop();
      }
    }
  }
  //console.log(remainingQuantity);
  return remainingQuantity;
}

const PORT = 3000
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});