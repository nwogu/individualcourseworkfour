//load Express.js
const express = require ('express');
const path = require('path');
const app = express ();
require('dotenv').config()

//load environment variables
db_username = process.env.DB_USERNAME
db_password = process.env.DB_PASSWORD
db_cluster = process.env.DB_CLUSTER
db_name = process.env.DB_NAME

static_dir = path.join(__dirname, 'public');


//parse the request parameters
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(static_dir));

//connect to MongoDB
const MongoClient = require('mongodb').MongoClient;
let db;
MongoClient.connect(`mongodb+srv://${db_username}:${db_password}@${db_cluster}/${db_name}?retryWrites=true&w=majority`,
(err, client) => {
    db = client.db('webstore')
});

//GET the collection name
app.param('collectionName', (req, res, next, collectionName) =>{
    req.collection = db.collection(collectionName)
    return next()
});

//logger middleware
app.use(function(req, res, next) {
    console.log("logger: request path: " + req.path)
    console.log("logger: request method: " + req.method)
    if (req.method == "POST") {
        console.log("logger: request body: " + JSON.stringify(req.body))
    }
    next();
  });

//image middleware
const imageMiddleware = (req, res, next) => {
    db.collection(req.params.collectionName).findOne(
        { _id: new ObjectID(req.params.id) },
        (e, result) => {
            if (e) return next(e)
            if (result == null) {
                res.status(404).json({message: "image not found"})
            } else {
                next();
            }
        }
    )
}


app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods", "*"); // allow CORS
    next();
  });

// display a message for root path to show the API is working
app.get('/', (req, res) =>{
    res.json ({status: "success"})
});

// retreive all the objects from a collection
app.get('/collection/:collectionName', (req, res) => {
    req.collection.find({}).toArray ((e, results) => {
        if (e) return next(e)
        res.json (results)
    });
});

// retreive an object by mongodb ID
const ObjectID = require('mongodb').ObjectID;
app.get('/collection/:collectionName/:id/image', imageMiddleware, (req, res, next) =>{
    req.collection.findOne(
        { _id: new ObjectID(req.params.id) },
        (e, result) => {
            if (e) return next(e)
            res.json({image: result.image});
        })
})

app.get('/refresh/:collectionName', (req, res, next) =>{
    req.collection.deleteMany({});
    const file = require('./lessons.js');
    req.collection.insertMany(file.lessons);
    return res.json({
        'status': 'success'
    });
})

app.get('/collection/:collectionName/:id', (req, res, next) =>{
    req.collection.findOne(
        { _id: new ObjectID(req.params.id) },
        (e, result) => {
            if (e) return next(e)
            res.json(result);
        })
})

// add an object
app.post('/collection/:collectionName', (req, res, next) => {
    req.collection.insert(req.body, (e, results) => {
        if (e) return next (e)
        res.json(results.ops)
    })
})

// update an object by ID
app.put('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.update(
        { _id: new ObjectID(req.params.id) },
        { $set: req.body },
        { safe: true, multi: false },
        (e, result) => {
            if (e) return next (e)
            res.json ((result.result.n === 1) ?
            {status: 'success'} : {status: 'error'})
        })
})

// delete an object by ID
app.delete('/collection/:collectionName/:id', (req, res, next) => {
    req.collection.deleteOne(
        { _id: ObjectID(req.params.id) },
        (e, result) => {
            if (e) return next(e)
            res.json((result.result.n === 1) ?
            {status: 'success'} : {status : 'error'})
        })
})

app.listen(process.env.PORT || 3000);
console.log ('server running on port 3000');