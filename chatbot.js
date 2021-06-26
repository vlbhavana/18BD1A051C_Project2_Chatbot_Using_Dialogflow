const express = require('express');
const {WebhookClient, Payload} = require('dialogflow-fulfillment');
const {payload} = require('dialogflow-fulfillment'); 
const app = express();

const MongoClient = require('mongodb').MongoClient;
const url = 'mongodb://127.0.0.1:27017/';

var randomstring = require('randomstring');
var username = "";

app.post("/dialogflow", express.json(),(req,res)=>{
    const agent = new WebhookClient({
        request: req, response: res
    });

    async function identifyUser(agent)
    {
        const ac_number = agent.parameters.ac_number;
        const client = new MongoClient(url,{useUnifiedTopology: true});
        await client.connect();
        try {
            const snap = await client.db("ServiceBotDb").collection("user_table").findOne({ac_number : ac_number});
            console.log(snap);
            if(snap==null)
            {
                await agent.add("Re-Enter your account number");
            }
            else{
                user_name = snap.username;
                await agent.add("Welcome "+user_name+"!! \n How can I help you?");
            }
        } catch (e) {
            console.log(e.message);
        }
    }
    function reportIssue(agent)
    {
        console.log("trouble ticket generation")
        var issue_vals ={
            1:"Internet Down",
            2:"Slow Internet",
            3:"Buffering problem"};
        const intent_val = agent.parameters.issue_num;
        var val = issue_vals[intent_val];
        var trouble_ticket_string = randomstring.generate(7);
        try{
            MongoClient.connect(url,{useUnifiedTopology: true}, (err, DB) => {
                if (err) throw err;
                var dbo = DB.db("ServiceBotDb");
                var u_name = user_name;
                var issue_val = val;
                var status = "pending";

                let ts = Date.now();
                let date_ob = new Date(ts);
                let date = date_ob.getDate();
                let month = date_ob.getMonth() + 1;
                let year = date_ob.getFullYear();
                var time_date = year + "-" + month + "-" + date;
                var myobj = {
                    username: u_name,
                    issue: issue_val,
                    status: status,
                    time_date: time_date,
                    trouble_ticket: trouble_ticket_string
                };
                dbo.collection("user_issues").insertOne(myobj, (err, res) => {
                    if (err) throw err;
                    DB.close();
                });
            });
            agent.add("You have reported '"+val+"'.\nSorry for the inconvenience.We have booked your complaint and\n the reference number is"+trouble_ticket_string);
        }
        catch(e)
        {
            console.log("ERROR : "+e.message);
        }
    }
    function customPayload(agent)
    {
        var payLoadData =
        {
            "richContent":[
                [
                    {
                        "type":"list",
                        "title": "Internet Down",
                        "subtitle" : "Press '1' if the internet is down ",
                        "event":{
                            "name":"",
                            "languageCode":"",
                            "parameters":{}
                        }
                    },
                    {
                        "type":"divider"
                    },
                    {
                        "type":"list",
                        "title": "Slow Internet",
                        "subtitle" : "Press '2' if the internet is slow ",
                        "event":{
                            "name":"",
                            "languageCode":"",
                            "parameters":{}
                        }
                    },
                    {
                        "type":"divider"
                    },
                    {
                        "type":"list",  
                        "title": "Buffering",
                        "subtitle" : "Press '3' if Buffering problem ",
                        "event":{
                            "name":"",
                            "languageCode":"",
                            "parameters":{}
                        }
                    }
                ]
            ]
        }
        agent.add(new Payload(agent.UNSPECIFIED,payLoadData,{sendAsMessage:true, rawPayload:true}));
    }
    var intentMap = new Map();
    intentMap.set("service_intent", identifyUser);
    intentMap.set("service_intent - custom", customPayload);
    intentMap.set("service_intent - custom - custom", reportIssue);
    agent.handleRequest(intentMap).catch((e)=>{console.log(e.message);});
});
app.listen(process.env.PORT || 8080);