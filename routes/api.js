const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const mysql = require("mysql");
const express = require("express");
const router = express.Router();
const env = require("dotenv")
const bcrypt = require("bcrypt")
const crypto =  require('crypto')
const randomBytes = crypto.randomBytes

function generateToken(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

const saltRounds = 10

const envData = env.config()?.parsed;

if (!envData) {
    throw new Error("ENV data not found")
}


// Database connections
const con = mysql.createConnection({
    host: envData.DB_SERVER_URL,
    user: envData.DB_USER,
    password: envData.DB_PASSWORD,
    database: envData.PLACE_DB
});
con.connect(err => {
    if (err) throw err;
    console.log("Connected to Place database!");
});

const con2 = mysql.createConnection({
    host: envData.DB_SERVER_URL,
    user: envData.DB_USER,
    password: envData.DB_PASSWORD,
    database: envData.PLACE_DB
});
con2.connect(err => {
    if (err) throw err;
    console.log("Connected to R database!");
});

router.get("/v2/checktoken.sjs", (req, res) => {
    con2.query(`SELECT * FROM tokens WHERE token = "${req.query.token}"`, (err, results, fields) => {
        if (results) {
        if (results[0]) {
            con2.query(`SELECT username FROM accounts WHERE id = ${results[0]["id"]}`, (err, result) => {
                console.log(results)
                res.send(JSON.stringify({
                    authenticated: true,
                    user: result[0]["username"],
                    theme: "modernDark"
                }))
            })
        } else {
            res.send('{"authenticated": false, "h":"h"}')
        }
        } else {
            res.send('{"authenticated": false}')
        }
    })
});

router.get("/v2/login.sjs", (req, res) => {
    let username = req.query.username
    const password = req.query.password
    
    if (username && password) {
        username = username.replaceAll(/[^a-z0-9]/ig, "")
        con2.query(`SELECT * FROM accounts WHERE username = "${username}" OR email = "${username}"`, (err, user) => {
            if (user[0]) {
                bcrypt.compare(password, user[0]["password"], (err, result) => {
                    if (err) {
                        res.status(500)
                        res.send("Something went very wrong. Please open an issue on the Place Open Source Project at https://github.com/An-Unnamed-Developer/Place2/ and specify Server, and paste the below logs. <br> " + err)
                    } else {
                        if (result) {
                            const token = generateToken(32)
                            let expDate = new Date()
                            expDate.setTime(parseInt((new Date().getTime() + 604800000)))
                            
                            expDate = `${expDate.getFullYear()}/${expDate.getMonth()+1}/${expDate.getDate()} ${expDate.getHours()}:${expDate.getMinutes()}:${expDate.getSeconds()}`
                            
                            con2.query(`INSERT INTO tokens (id, token, timestamp, expires) VALUES (${user[0]["id"]}, "${token}", CURRENT_TIMESTAMP, "${expDate}")`, (err, result) => {
                                if (err) {
                                    res.status(500)
                                    res.send("Something went very wrong. Please open an issue on the Place Open Source Project at https://github.com/An-Unnamed-Developer/Place2/ and specify Server, and paste the below logs. <br> " + err)
                                } else {
                                    res.status(200)
                                    res.send(JSON.stringify({
                                        'token': token,
                                        'theme': "modernDark"
                                    }))
                                }
                            })
                        }
                    }
                })
            } else {
                res.status(400)
                res.send("No account was found with that username or email.")
            }
        })
    } else {
        res.status(400)
        res.send("Missing parameter")
    }
});

router.get("/v2/register.sjs", (req, res) => {
    let username = req.query.username
    const email = req.query.email
    const password = req.query.password

    if (username && email && password) {
        username = username.replaceAll(/[^a-z0-9]/ig, "")
        con2.query(`SELECT * FROM accounts WHERE email = "${email}" OR username = "${username}"`, (err, result) => {
            if (result[0]) {
                res.status(400)
                res.send("Email or username in use.")
            } else {
                bcrypt.hash(password, saltRounds, (err, pwhash) => {
                con2.query(`INSERT INTO accounts (username, email, password, date) VALUES ("${username}", "${email}", "${pwhash}", CURRENT_TIMESTAMP)`, (err, result) => {
                        if (err) {
                            res.status(500)
                            res.send("Something went wrong")
                        } else {
                            res.status(200)
                            res.send("Signup successful, you can now log in.")
                        }
                    })
                })
            }
        })
    } else {
        res.status(400)
        res.send("Missing parameter")
    }
});

router.get("/v2/siteMessage.sjs", (req, res) => {
    // do later
});


router.get('/v1/get_pixel.sjs', (req, res) => {
    let canvas = "place"
    if (req.query.canvas) {
        canvas = req.query.canvas
    }
    con.query(`SELECT x,y,color,userid FROM pixels WHERE canvasID = '${canvas}'`, function(err, result, fields) {
        if (err) throw err;
        //echo("[]")
        res.send(JSON.stringify(result));
    })
});

router.get("/v2/getuserinfo.sjs", (req, res) => {
    console.log(req.query.id)
    con2.query(`SELECT username FROM accounts WHERE id = ${parseInt(req.query.id)}`, function(err, result, fields) {
        try {
        res.send(JSON.stringify({"user" :result[0]["username"]}))   
        console.log(result) 
        } catch {
            res.status(500);
            res.send("Something went wrong");
        }
    })
})

router.get("/v3/getCanvasInfo", (req, res) => {
    if (!req.query.canvas) {
        res.status(400)
        res.send("No canvas ID specified.")
        return;
    }

    con.query(`SELECT * FROM canvasses WHERE canvasString = '${req.query.canvas}'`, function(err, result, fields) {
        if (err) throw err;
        //echo("[]")
        res.send(JSON.stringify(result));
    })
})

router.get("/v3/getPublicCanvasList/", (req, res) => {
    con.query(`SELECT * FROM canvasses WHERE public = 1`, function(err, result, fields) {
        if (err) throw err;
        //echo("[]")
        res.send(JSON.stringify(result));
    })
})

router.get("/v3/status/", (req, res) => {
    con.query(`SELECT * FROM status WHERE current = 1`, function(err, result, fields) {
        if (err) throw err;
        //echo("[]")
        res.send(JSON.stringify(result));
    })
})

router.get("/v3/survey/", (req, res) => {
    con.query(`INSERT INTO survey (survey_id, response) VALUES (${req.query.survey}, '${req.query.response}')`, function(err, result, fields) {
        if (err) throw err;
        //echo("[]")
        res.send("success");
    })
})

router.get("/ping/", (req, res) => {
    res.send("Pong")
})

module.exports = router;