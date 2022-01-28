"use strict";

const express = require("express");
const app = express();
const PORT = 8080; // default port 8080
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const salt = bcrypt.genSaltSync(10);
const cookieSession = require("cookie-session");

const { getUserByEmail } = require("./helpers");

app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(
  cookieSession({
    name: "session",
    keys: ["key1", "key2"],
  })
);

// Simulate database /////////////////////////////////
// const urlDatabase = {
//   b2xVn2: "http://www.lighthouselabs.ca",
//   "9sm5xK": "http://www.google.com",
// };

const urlDatabase = {
  b6UTxQ: {
    longURL: "https://www.tsn.ca",
    userID: "aJ48lW",
  },
  i3BoGr: {
    longURL: "https://www.google.ca",
    userID: "aJ48lW",
  },
  i3vcd3: {
    longURL: "https://www.google.ca",
    userID: "user2RandomID",
  },
};

const users = {
  aJ48lW: {
    id: "aJ48lW",
    email: "use@ex.com",
    password: "$2a$10$Vx5zYp6eKBZd2x7J1mngoOecqc5vLNW2nrNN5bfNAynCUOnITQJVS",
  },
  user2RandomID: {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk",
  },
};
//////////////////////////////////////////////////////

// Generate alphanumeric string //////////////////////
const generateRandomString = (n) => {
  let randomString = "";
  let characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < n; i++) {
    randomString += characters.charAt(Math.random() * characters.length);
  }
  return randomString;
};

// Helper function for getting individual user from database
// const getUserByEmail = function (email) {
//   for (const user in users) {
//     if (!email === users[user].email) {
//       return null;
//     }
//     return users[user];
//   }
// };

// In order to make our helper function testable,
// we first need to make it modular. This means our function should be self-contained;
// everything it needs should either be in the function itself,
// or passed in to it as a parameter. Applying this to our user lookup function,
// we should pass in both the email of the user we're looking up, and the users database.
// Our helper function should have a signature that looks a little like this:

// const getUserByEmail = function(email, database) {
//   // lookup magic...
//   return user;
// };

// Create a function named urlsForUser(id) which returns the URLs where the userID is equal to the id of the currently logged-in user.
const urlsForUser = function (id) {
  const result = {};
  for (const shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      // urlDatabase[shortURL].longURL;
      result[shortURL] = urlDatabase[shortURL];
    }
  }
  return result;
};

//////////////////////////////////////////////////////

// render homepage
app.get("/urls", (req, res) => {
  if (!req.session["user_id"]) {
    return res.redirect("/login");
  }

  const templateVars = {
    urls: urlsForUser(req.session["user_id"]),
    user: users[req.session["user_id"]],
  };
  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  const { longURL } = req.body;
  const shortURL = generateRandomString(6);
  // console.log(shortURL, longURL);
  urlDatabase[shortURL].longURL = longURL;
  // console.log(urlDatabase);

  const templateVars = {
    shortURL,
    longURL,
  };
  // console.log("check", templateVars);
  res.render("urls_show", templateVars);
});

app.get("/urls/new", (req, res) => {
  const templateVars = {
    user: users[req.session["user_id"]],
  };

  if (!users[req.session["user_id"]]) {
    return res.redirect("/login");
  }

  res.render("urls_new", templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
  const templateVars = {
    user: users[req.session["user_id"]],
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
  };
  res.render("urls_show", templateVars);
});

app.get("/u/:shortURL", (req, res) => {
  if (!urlDatabase[req.params.shortURL]) {
    return res.status(400).send("Bad request");
  }
  const longURL = urlDatabase[req.params.shortURL].longURL;
  res.redirect(longURL);
});

// delete
app.post("/urls/:shortURL/delete", (req, res) => {
  const shortURL = req.params.shortURL;
  if (req.session["user_id"] === urlDatabase[shortURL].userID) {
    delete urlDatabase[shortURL];
  }
  res.redirect("/urls");
});

// edit
app.post("/urls/:id", (req, res) => {
  const id = req.params.id;
  if (req.session["user_id"] === id) {
    urlDatabase[id].longURL = req.body.longURL;
  }
  res.redirect("/urls");
});

// render user registration page
app.get("/register", (req, res) => {
  const templateVars = {
    user: users[req.session["user_id"]],
  };
  res.render("register", templateVars);
});

// register a new user
app.post("/register", (req, res) => {
  const id = generateRandomString(6);
  const email = req.body.email;
  const hashedPassword = bcrypt.hashSync(req.body.password, salt);

  if (!email || !hashedPassword) {
    return res.status(400).send("e-mail and password can not be blank!");
  }

  const user = getUserByEmail(email, users);
  if (user.email === email) {
    return res.status(400).send("This e-mail has been registered.");
  }

  users[id] = {
    id,
    email,
    hashedPassword,
  };
  req.session["user_id"] = id;
  res.redirect("/urls");
});

// LOGIN
app.get("/login", (req, res) => {
  const templateVars = {
    user: users[req.session["user_id"]],
  };
  res.render("login", templateVars);
});

app.post("/login", (req, res) => {
  const email = req.body.email;
  const hashedPassword = bcrypt.hashSync(req.body.password, salt);
  console.log(hashedPassword);

  if (!email || !hashedPassword) {
    return res.status(400).send("e-mail and password can not be blank!");
  }

  const user = getUserByEmail(email, users);
  if (!user) {
    return res.status(430).send("e-mail not found");
  }
  if (!bcrypt.compareSync(users[user].password, hashedPassword)) {
    return res.status(430).send("Password doesn't match");
  }

  req.session["user_id"] = user.id;
  res.redirect("/urls");
});

// LOGOUT
app.post("/logout", (req, res) => {
  req.session["user_id"] = null;
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`);
});
