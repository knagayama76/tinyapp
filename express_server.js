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

// Database /////////////////////////////////

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
  userRandomID: {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur",
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

// Create a function named urlsForUser(id) which returns the URLs where the userID is equal to the id of the currently logged-in user.
const urlsForUser = function (id) {
  const result = {};
  for (const shortURL in urlDatabase) {
    if (urlDatabase[shortURL].userID === id) {
      // result.shortURL = shortURL;
      // result.longURL = urlDatabase[shortURL].longURL;
      result[shortURL] = {
        longURL: urlDatabase[shortURL].longURL,
        userID: urlDatabase[shortURL].userID,
      };
    }
  }
  return result;
};

//////////////////////////////////////////////////////

app.get("/", (req, res) => {
  if (req.session["user_id"]) {
    res.redirect("/urls");
  }
});

// render homepage
app.get("/urls", (req, res) => {
  if (!req.session["user_id"]) {
    return res.redirect("/login");
  }

  const user = users[req.session["user_id"]];

  const templateVars = {
    user,
    urls: urlsForUser(user.id),
  };

  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  const user = users[req.session["user_id"]];
  const shortURL = generateRandomString(6);
  const { longURL } = req.body;

  const templateVars = {
    user,
    shortURL,
    longURL,
  };

  urlDatabase[shortURL] = { longURL, userID: user.id };

  res.render("urls_show", templateVars);
});

app.get("/urls/new", (req, res) => {
  if (!users[req.session["user_id"]]) {
    return res.redirect("/login");
  }

  const templateVars = {
    user: users[req.session["user_id"]],
  };

  res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  const templateVars = {
    user: users[req.session["user_id"]],
    shortURL: req.params.id,
    longURL: urlDatabase[req.params.id].longURL,
  };
  res.render("urls_show", templateVars);
});

app.get("/u/:id", (req, res) => {
  if (!urlDatabase[req.params.id]) {
    return res.status(400).send("Bad request");
  }
  const longURL = urlDatabase[req.params.id].longURL;
  res.redirect(longURL);
});

// delete
app.post("/urls/:id/delete", (req, res) => {
  const shortURL = req.params.id;
  if (req.session["user_id"] === urlDatabase[shortURL].userID) {
    delete urlDatabase[shortURL];
  }
  res.redirect("/urls");
});

// edit
app.post("/urls/:id", (req, res) => {
  const newURL = req.body.longURL;
  const shortURL = req.params.id;

  if (req.session["user_id"] === urlDatabase[shortURL].userID) {
    urlDatabase[shortURL].longURL = newURL;
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

  if (getUserByEmail(email, users)) {
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
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(req.body.password, salt);
  console.log("email:", email, "password:", hashedPassword);

  if (!email || !password) {
    return res.status(400).send("e-mail and password can not be blank!");
  }

  const user = getUserByEmail(email, users);
  if (!user) {
    return res.status(430).send("e-mail not found");
  }

  if (bcrypt.compareSync(users[user].password, hashedPassword)) {
    console.log(users[user].password);
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
