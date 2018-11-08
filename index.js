const express = require('express');
var bodyParser = require('body-parser')
const app = express();
var MongoClient = require('mongodb').MongoClient;
var mongoURL = 'mongodb://localhost:27017/ServSafeCMS';
var db;
var usersDB;
var assert = require('assert');

const jwt = require('jsonwebtoken');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const secretJWTKey = "$2b$10$A3KpF57UVuTSM3QC4kOyEuA8/kpISn9CHXSDk5.YQnh1NKwAb/0De"

/*response headers*/
app.use(function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
	next();
});
/*public folder for resources available at http://yourdomain/* */
app.use(express.static('public'))
app.use(express.json()); 
app.use( bodyParser.json() );

app.get('/api', (req, res) => {
	res.json({
		message: "Hi."
	});
});

//protected route which must have jwt token in headers.Authorization == "Bearer <token>"
app.post('/api/post', authorize, (req, res) => {
	//after authorize middle ware req will have auth.token, auth.user, auth.authData
	console.log("win");
	var user = req.user;
	console.log(user);
	res.json(user);
});

app.post('/api/login', (req, res) => {
	//mock user
	//const user = {id:1, username: 'mark', email: 'whatever@gmail.com'}
	let reqUserName = req.body.userName;
	let reqPW = req.body.pw;
	var foundUser = {};
	console.log("login attempt with "+reqUserName+" and "+reqPW);
	var userCollection = usersDB.collection('userCollection');
	userCollection.find({"userName":reqUserName}).toArray(function(err, items) {
		if(items.length == 0){
			res.json({"Error":"User not found."});
			return;
		}
		if(items.length > 1){
			res.json({"Error":"Multiple users under that username"});
			return;
		}
		if(items.length == 1){
			
			foundUser = items[0];
			console.log(foundUser);
			var validPW = bcrypt.compareSync(reqPW, foundUser.passwordHash);
			if(validPW){
				console.log("password is valid");
				delete foundUser.token;
				
				jwt.sign({user:foundUser}, secretJWTKey, {expiresIn: "20 minutes"}, (err, token) => {
					console.log("inside jwt sign");
					console.log(token);
					
					foundUser.token = token;
					
					var my_id = foundUser._id;
					var user = foundUser;
					delete user._id
					
					console.log(my_id);
					console.log(user);
					
					userCollection.update({"userName":foundUser.userName}, foundUser, {upsert:false});
					res.send(foundUser);
				});
			}else{
				console.log("password is invalid");
				res.send(401);
			}
		}
	});
});

app.post('/api/createAccount', (req, res) => {
	//mock user
	//const user = {id:1, username: 'mark', email: 'whatever@gmail.com'}
	//console.log(req);
	let reqUserName = req.body.userName;
	let reqPW = req.body.pw;
	let reqEmail = req.body.email;
	let reqFirst = req.body.firstName;
	let reqLast = req.body.lastName;
	
	console.log(reqUserName);
	console.log(reqPW);
	
	let hash = bcrypt.hashSync(reqPW, 10);
	
	let newUser = {
		"userName":reqUserName,
		"passwordHash":hash,
		"email":reqEmail,
		"firstName": reqFirst,
		"lastName": reqLast,
		"createdOn":new Date(),
		"token": "",
		"roles":[]
	};
	
	jwt.sign({user:newUser}, secretJWTKey, (err, token) => {
		newUser.token = token;
		
		var my_id = newUser._id;
		var myObj = newUser;
		delete myObj._id
		console.log("received PUT for: "+req.body.name);
		collection.findOneAndUpdate({_id:ObjectId(my_id)}, req.body , function(err, doc) {
			if(err){
				console.log(err);
			}
			res.send("got the put request: "+JSON.stringify(req.body));
		});
	});
	
	var userCollection = usersDB.collection('userCollection');
	userCollection.find({"userName":reqUserName}).toArray(function(err, items) {
		console.log(items);
		console.log("-------------");
		if(items.length > 0){
			var firstObj = items[0];
			console.log("User already exists");
			console.log("oldUser:");
		res.json({"Error":"User already exists"});
		}else{
			console.log("User inserted");
			userCollection.insertOne(newUser)
			console.log("newUser:");
			res.json({newUser});
		}
	});

});

//FORMAT OF TOKEN
//Authorization: Bearer <access_token>
function verifyToken(req, res, next){
	//get auth header value
	const bearerHeader = req.headers['authorization'];
	if(typeof bearerHeader != 'undefined'){
		const bearer = bearerHeader.split(' ');
		const bearerToken = bearer[1];
		req.token = bearerToken;
		next();
	}else{
		res.sendStatus(403);
	}
}
function verifyJWT(req, res, next){
	jwt.verify(req.token, secretJWTKey, (err, authData) => {
		if(err){
			res.sendStatus(403);
		}else{
			req.authData = authData;
			req.user = authData.user;
			req.user.token = req.token;
			next();
		}	
	});
}

function authorize(req, res, next){
	const bearerHeader = req.headers['authorization'];
	if(typeof bearerHeader != 'undefined'){
		const bearer = bearerHeader.split(' ');
		const bearerToken = bearer[1];
		req.token = bearerToken;
	}else{
		res.sendStatus(403);
	}
	
	jwt.verify(req.token, secretJWTKey, (err, authData) => {
		if(err){
			res.sendStatus(403);
		}else{
			req.authData = authData;
			req.user = authData.user;
			req.user.token = req.token;
			next();
		}	
	});
}

/*
//if you don't need mongo, you can just open a server directly
app.listen(8080, function() {
	console.log('Listening on port 8080...')
});
*/	
// Connect to Mongo on start
MongoClient.connect(mongoURL, function(err, mdb) {
	assert.equal(null, err);
  if (err) {
    console.log('Unable to connect to Mongo.')
    process.exit(1)
  } else {
	//switch to your db.
	db = mdb.db("test");
	usersDB = mdb.db("usersDB");
	//listen on a port
    app.listen(8080, function() {
      console.log('Listening on port 8080...')
    })
  }
})
