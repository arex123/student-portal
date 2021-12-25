const express = require('express');
const path = require('path');
const mongoose = require("mongoose");
var bodyParser = require("body-parser")
const bcrypt = require('bcrypt');
const Joi = require('joi'); // for validation
const session = require('express-session');
const jwt = require('jsonwebtoken');
const fs = require('fs');



const app = express();
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'views')));



require("dotenv").config();

const URI = process.env.ATLAS_URI;
mongoose.connect(URI,{
    useNewUrlParser:true,
    useUnifiedTopology:true
},err=>{
    if(err) throw err;
    console.log("connected to MONGODB!!!!");
});
var db=mongoose.connection;


//session
app.use(session({
    secret: 'thisisasecret',
    saveUninitialized: false,
    resave: false
    })
);




app.use(express.urlencoded({ extended: true }));

// app.use(express.static('public'));

  
var engine = require('consolidate');
const { json } = require('body-parser');

// app.set('views', __dirname + '/views');
app.engine('html', engine.mustache);
// app.set('view engine', 'html');


function validateUser(user)
{
    const JoiSchema = Joi.object({
      
        name: Joi.string()
                  .min(3)
                  .max(30)
                  .required(),
                    
        email: Joi.string()
               .email()
               .min(5)
               .max(50)
               .required(), 
                
        pass: Joi.string().regex(/^[a-zA-Z0-9]{3,30}$/)

       
    }).options({ abortEarly: false });
  


    console.log(JoiSchema.validate(user));
    return JoiSchema.validate(user)
}

//email sending

const mailjet = require ('node-mailjet')
.connect('66abd85fb4ae5afd3684cbbcc7229496', '22847158d23fef4004a80eac353e4b77')

function msg(req){


    console.log("token=",req.token);
    var em= "<h3>Dear "+ req.body.name+", welcome to saitm <a href='https://studentportal0.herokuapp.com/verify_account?verification_key="+req.token+"'>Verify your account</a>!</h3><br />May the delivery force be with you!";
        
    const request = mailjet
    .post("send", {'version': 'v3.1'})
    .request({
        "Messages":[
            {
                "From": {
                    "Email": "iwanttoearn01@gmail.com",
                    "Name": "aditya"
                },
      "To": [
          {
              "Email": req.body.email,
              "Name": req.body.name
            }
        ],
        "Subject": "Greetings from Mailjet.",
        "TextPart": "My first Mailjet email",
        "HTMLPart": em,
        "CustomID": "AppGettingStartedTest"
    }
]
})
request
.then((result) => {
    console.log(result.body)
})
.catch((err) => {
    console.log(err.statusCode)
});


}


////////////////////////////////////




app.post("/login", function(req, res) {
    
    
    db.collection('details').findOne({ email: req.body.email }, function(err, user){
            if(err) {
                  console.log(err);
                }
                var message;

                
                if(user) {

                    const isValidPass = bcrypt.compareSync(req.body.password, user.password);
                    if(!isValidPass || !user.isVerify){

                        res.send('user not verified')
                        // res.redirect("/");                        
                        return;
                    }                       
                        req.session.email = req.body.email;
                        console.log(user)                      
                        message = "user exists";
                        console.log(message)
                        res.redirect("/home");                 


                    } else {
                        message= "user doesn't exist";
                        res.send("user does not exist")
                        // res.redirect("/");
                        console.log(message)
                        }
                    });
});


app.post('/register', function(req,res){



    var name = req.body.name;
    var email =req.body.email;
    var pass = req.body.password;
    // Generate Salt

    var obj= {
        name: name,
        email: email,
        pass: pass
        
    }

    if(validateUser(obj).error!==null){
        console.log("does not validate");
        res.redirect("/register")
        return;
    }

    db.collection('details').findOne({ email: req.body.email }, function(err, user){
        if(err) {
              console.log("errpr");
            }
            // var message;

            
            if(user) {
                console.log("user exist");
                res.redirect("/register");
            }else{

                const salt = bcrypt.genSaltSync(10);

                // Hash Password
                const hash = bcrypt.hashSync(pass, salt);
            
                var data = {
                    "name": name,
                    "email":email,
                    "password":hash,
                    "isVerify":false,
                    Contact: "",
                    Course:"",
                    Regid:"",
                    Branch:"",
                    Sem:"",
                    Skills:"",
                    Rollno:"",
                    Linkedin:"",
                    Github:"",
                    Instagram:"",
                    Portfolio:"",
                    FaceBook:""
                }

                db.collection('details').insertOne(data,function(err, collection){
                    if (err) throw err;
                    console.log("Record inserted Successfully");
                        
                });


                // db.collection('details').findOne({ email: email }, function(err, user){                       
                    
                    //jwt 
                   
                    // console.log("usr    ",user);
                        let token = jwt.sign( 
                            {
                                // user : user._id,
                                email:email
                            }   ,                    
                        'secret05'
                        );
                        req.token = token;
                        msg(req);
                    // });
                res.redirect("/");

            }
                
    });

    
});
// header:
// {
// "alg" : "HS256",

// "typ" : "JWT"
// };


app.get('/verify_account',function(req,res){
    // console.log(req.query.verification_key);

    var token = req.query.verification_key;
    const decode = jwt.verify(token, 'secret05');

    // var myquery = { "insertedId" :  ObjectId(decode.user)};
    var myquery = { email: decode.email};

    console.log("decode user email:  ",decode);
    var newvalues = {$set: {isVerify: true} };
    db.collection("details").updateOne(myquery, newvalues, function(err, res) {
      if (err) console.log("error");
      console.log("1 document updated");
    });
    res.end("you are succesfully verified");
});


function checkSession(req,res,next){
    if(req.session.email !== undefined)    {
        console.log("session created and funciton got bypasses");
        next();
    }else{
        console.log("session not created");
        res.redirect('/');
    }

    
}

app.get('/home',checkSession,function(req,res){
        
    res.render('home.ejs',{
        email: req.session.email
    });
    // res.render('screen.html')
    

});


app.get('/profile',checkSession,function(req,res){

    res.render('profile.ejs',{
        email:req.session.email
    });

});


app.get('/classroom',checkSession,function(req,res){

    db.collection('details').findOne({ email: req.session.email }, function(err, user){
        if(err){
            console.log(err);
        }else{

            console.log("user  hello",user);
            
            let sem = user.Sem;
            let Branch = user.Branch;
            let course = user.Course;
            console.log(sem," ",Branch," ",course);
            
            
            //json file reading
            
            // let buffer = fs.readFileSync("./data.json");
            // let data = JSON.parse(buffer);
            // console.log("daa",data[course][Branch][sem].subjects);
            // let obj = data[course][Branch][sem].subjects;
            // console.log(obj.length);
            res.render('classroom.ejs',{ user});

            
         }

    });



});


app.get('/logout', (req, res) => {

    req.session.destroy(err => {
    if (err) {
    return console.log(err);
    }
    res.redirect('/');
    });
});


app.get('/register',(req,res) =>{
  
    res.render('signUp.html');

});





 app.get("/fetch",function(req,res){

    db.collection('details').findOne({ email: req.session.email }, function(err, user){

    res.send(JSON.stringify(user));
});
});


app.post("/save",function(req,res){

    var user1 = JSON.parse(Object.keys(req.body)[0]);
    console.log(user1);
 
    db.collection('details').update({email:req.session.email},{$set:user1});
     
});





//change password


app.get('/forgetpass',function(req,res){ //from login page
    res.render('forgetpsd.html');
})



app.post("/forgetpsd",function(req,res){  //from forgetpsd page

    var email =req.body.email;
    // var name= "user";
    console.log("mailjet call hone se pahle");

    let token = jwt.sign( 
        {
            // user : user._id,
            email:email
        }   ,                    
    'secret005'
    );
    req.token=token;
    msg(req)

    
function msg(req){

    var em= "<h3>Dear user, You forget the password right?? if yes <a href='https://studentportal0.herokuapp.com/change_password?verification_key="+req.token+"'>Verify your account click on link</a>!</h3><br />May the delivery force be with you!";
        
    const request = mailjet
    .post("send", {'version': 'v3.1'})
    .request({
        "Messages":[
            {
                "From": {
                    "Email": "iwanttoearn01@gmail.com",
                    "Name": "aditya"
                },
      "To": [
          {
              "Email": req.body.email,
              "Name": "user"
            }
        ],
        "Subject": "Change Password",
        "TextPart": "My first Mailjet email",
        "HTMLPart": em,
        "CustomID": "AppGettingStartedTest"
    }
]
})
request
.then((result) => {
    console.log("change password message sent ", result.body)
    res.redirect("/");
})
.catch((err) => {
    console.log(err.statusCode)
});


}


})


app.get('/change_password',function(req,res){

    var token = req.query.verification_key;
    // const decode = jwt.verify(token, 'secret005');


    res.render('changepsd.ejs',{
        email:token
    });

});




app.post('/updatepsd',function(req,res){

    var newpass = req.body.password;
    const decode = jwt.verify(req.body.verify, 'secret005');

    var email = decode.email;

    
    const salt = bcrypt.genSaltSync(10);

    // Hash Password
    const hash = bcrypt.hashSync(newpass, salt);


    db.collection('details').updateOne(
        {email:email},
        {$set:{password:hash}}
     );
        res.redirect("/");
});


//previos error got solved now it does not work becaus express.static load bydefault index.html page 
app.get('/',(req,res) =>{
    let sess = req.session;
    if(sess.email) {
        return res.redirect('home');
    }
    res.render('login.html');

});

app.get('/subdata',(req,res)=>{

    db.collection('details').findOne({ email: req.session.email }, function(err, user){
        if(err){
            console.log(err);
        }else{

            console.log("user  hello",user);
            
            let sem = user.Sem;
            let Branch = user.Branch;
            let course = user.Course;
            console.log(sem," ",Branch," ",course);
            
            
            //json file reading
            
            let buffer = fs.readFileSync("./data.json");
            let data = JSON.parse(buffer);
            // console.log("daa",data[course][Branch][sem].subjects);
            let obj = data[course][Branch][sem].subjects;
            // console.log(obj.length);
            // res.render('classroom.ejs',{ user,obj});
            res.send(JSON.stringify(obj));
            
         }

    });

})

app.get('/pracdata',(req,res)=>{

    db.collection('details').findOne({ email: req.session.email }, function(err, user){
        if(err){
            console.log(err);
        }else{
            
            //json file reading
            let sem = user.Sem;
            let Branch = user.Branch;
            let course = user.Course;
            let buffer = fs.readFileSync("./data.json");
            let practdata = JSON.parse(buffer);
            // console.log("daa",data[course][Branch][sem].subjects);
            let pobj = practdata[course][Branch][sem].practical;
            // console.log(obj.length);
            // res.render('classroom.ejs',{ user,obj});
            res.send(JSON.stringify(pobj));
            
         }

    });



})


// //char room

// app.get('/chatRoom',(req,res)=>{
//     const path = require("path");
//     const http = require("http");
//     const socketio = require("socket.io");
//     const server = http.createServer(app);
//     const io = socketio(server);
//     const formatMessage = require("./util/message");
   
    
//     const {
//         userJoin,
//         getCurrentUser,
//         userLeave,
//         getRoomUsers,
//     } = require("./util/users");
    
    
//     app.use(express.static(path.join(__dirname, "public")));
//     const bot = "chadbox bot";
    
//     io.on("connection", (socket) => {
//     //first code-> // console.log('New WS connection...');
  
//     socket.on("joinRoom", ({ username, room }) => {
//       const user = userJoin(socket.id, username, room);
//       socket.join(user.room);
  
//       //broadcast when a user connects
//       socket.emit("message", formatMessage(bot, "Welcome to chadbox!")); //it will emit/tell to only connected client
  
//       socket.broadcast
//         .to(user.room)
//         .emit("message", formatMessage(bot, `${user.username} is connected!`)); //it will emit(tell) to everyone except himself
  
//       //send users to room info
//       io.to(user.room).emit("roomUsers", {
//         room: user.room,
//         users: getRoomUsers(user.room),
//       });
//     });
  
//     //Listen to chatmessage
//     socket.on("chatMessage", (msg) => {
//       const user = getCurrentUser(socket.id);
//       io.to(user.room).emit("message", formatMessage(user.username, msg));
//     });
  
//     //Runs when client disconnects
//     socket.on("disconnect", () => {
//       const user = userLeave(socket.id);
  
//       if (user) {
//         io.to(user.room).emit(
//           "message",
//           formatMessage(bot, `${user.username} has left the chat`)
//         );
  
//         //send users to room info
//         io.to(user.room).emit("roomUsers", {
//           room: user.room,
//           users: getRoomUsers(user.room),
//         });
//       }
//     });
  
//     //io.emit() it will emit to everybody
//   });


  
// const PORT = 3000 || process.env.PORT;

// server.listen(PORT, () => console.log(`server started ${PORT}`));





// })











require('dotenv').config()
const PORT =process.env.PORT;

app.listen(PORT,() =>
    console.log(`Server running at port ${PORT}`)
);