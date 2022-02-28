let express = require('express')
let mongo = require('mongodb').MongoClient;
var cors = require('cors')
var bodyParser = require('body-parser');
const { ObjectId } = require('mongodb');
require('dotenv').config();
let app = express();

app.use(cors())
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
})); 

let mongoAddress = process.env.MONGO_USER;

var port = process.env.PORT || 4000;

app.get('/', (req, res) => res.send({test: "value"}));

// Takes: a users uid
// Action: Returns all documents in logs that have that user uid
app.get('/logs/:uid', function(req, res) {
    mongo.connect(mongoAddress, async function(error, client) {
        if(error) throw error;
        var logResults = []
        var db = client.db('mytestingdb');
        var logsIterator = db.collection('logs').find({user_uid: req.params.uid})
        logsIterator.forEach(function(log, err) {
            if(err) throw err;
            if(log) {
                logResults.push(log)
            }
        }, function() {
            console.log(logResults)
            client.close()
            res.send({logs: logResults})
        })
    })

});

// Takes: a users uid
// Action: Looks for a user with that uid and returns data, if no user exists it creates a default user and returns that data
app.get('/user/:uid', function(req, res) {
    console.log(req.params.uid)
    mongo.connect(mongoAddress, function(error, client) {
        if(error) throw error;
        var db = client.db('mytestingdb');
        db.collection('users').findOne({user_uid: req.params.uid}, function(error, user) {
            if(error) throw error;
            if(user) {
                res.send({status: "Fetched existing user", user: user})
                client.close();
            } else {
                let newUser = {
                    user_uid: req.params.uid,
                    tracked_items: ['Squat', 'Deadlift', 'Bench Press', 'Shoulder Press']
                }

                db.collection('users').insertOne(newUser, function(error) {
                    if(error) throw error;
                    res.send({status: "Created new user", user: newUser})
                    client.close();
                })
            }
        })
    })

});


// Takes: a users uid, exercise, date, weight, reps
// Action: Looks for an exercise with the same date and uid if its found it updates the document with the new log,
// if its not found it creates a new log with the given information
app.post('/log-lift', function(req, res) {
    if(
        req.body.exercise === '' ||
        req.body.date === '' ||
        req.body.weight === '' ||
        req.body.reps === ''
    ) {
        res.status(400).send({
            message: 'All paramaters need to be filled'
         });
    } else {
        let lift = {
            tracked_item: req.body.exercise,
            weight: req.body.weight,
            reps: req.body.reps,
            date: req.body.date,
            user_uid: req.body.uid
        }
    
        mongo.connect(mongoAddress, function(error, client) {
            if(error) throw error;
            var db = client.db('mytestingdb');

            db.collection('logs').findOne({date: lift.date, user_uid: lift.user_uid, tracked_item: lift.tracked_item}, function(error, log) {
                if(error) throw error;
                if(log) {
                    db.collection('logs').updateOne({"_id": ObjectId(log._id)}, {$set: lift}, function(error) {
                        if(error) throw error;
                        res.send({status: "Updated existing log"})
                        client.close();
                    })
                } else {
                    db.collection('logs').insertOne(lift, function(error) {
                        if(error) throw error;
                        client.close();
                        res.send({message: 'Log created'})
                    })
                }
            })
        })
    }
});

app.listen(port, function () {
     console.log("Running on port " + port);
});