const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");

const uri = process.env.MONGODB_URI
const app = express();
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

//Connect to mongoDB
mongoose.connect(uri, { useUnifiedTopology: true, useNewUrlParser: true })
.then(() => console.log('MongoDB connected!'))
.catch(err => console.log('Error:- ' + err));

//create new Schema (data type)
const todoItem = new mongoose.Schema({
    name: String
})

//Schema for dynamic list, select Datatype of array of items
const dynamicSchema = {
    name: String, //name of list to be stored
    items: [todoItem] //individdual items will follow todoItem schema
}

//Create new model (collection) and assign Schema
const Todo = new mongoose.model("Todo", todoItem);

//Model for dynamic todo list (collection, with a DIFFERENT schema than default Todo)
const DynamicTodo = new mongoose.model("DynamicTodo", dynamicSchema);

let dynamicListNames = [];
//Function for Navbar - Search DB, add to array and replace existing array
//FIXED - IF ELSE conditions account for Errors, empty array and filled array
const searchAndUpdateNavbar = function(){
    DynamicTodo.find({}, function(err, foundItems){
        if(err){
            console.log(err)
        } else {
            if (!foundItems){
                dynamicListNames = [];
            } else {
                const updateDynamicListNames = [];
                foundItems.forEach(function(item){
                    updateDynamicListNames.push(item.name);
                    dynamicListNames = updateDynamicListNames;
                    console.log(dynamicListNames);
                })
            }
        }
    });
} 


app.get("/", function(req,res){
    
    //Function for navbar, solves problem of repeated code 
    searchAndUpdateNavbar();

    //Find items in collection in DB  when page loads
    //Render all the foundItems as the 'list'
    Todo.find({}, function(err, foundItems){
        console.log(foundItems); //logging all item objects
        foundItems.forEach(item => console.log(`Will render: ${item.name}, ${item._id}`)); //Checking name and ID of each item
        res.render("list", {listTitle: "General", itemList: foundItems, dynamicListNames: dynamicListNames}); //This is a list, change EJS tag to FOUND.name
    });

    
});

app.post("/", function(req,res){
    const itemName = req.body.itemName;
    const listName = req.body.listName; //show button value

    //create document to be added to DB when post
    //Refer to ABOVE itemName (input field)
    const newTodo = new Todo({
        name: itemName
    });
    
    console.log(listName);//Which list is worked on?

    //Check if post is coming from General OR Dynamic Route
    //If general: save to normal collection
    //If Dynamic, add to 'items' from dynamic schema
    if (listName === 'General'){
        newTodo.save();
        res.redirect("/");
    } else {
        DynamicTodo.findOne({name: listName}, function(err,foundItem){
            console.log(foundItem);
            foundItem.items.push(newTodo);
            foundItem.save();
            console.log(`Pushed ${newTodo}`);
            res.redirect("/"+listName);
        });
       
    }
    
})

// //creating routes for another page
// app.get("/work", function(req,res){
//     res.render("list", {listTitle: "Work", itemList: workList}) //render a differnet array
// })

app.post("/delete", function(req,res){
    //Get item ID from list by assignent name+value to checkbox
    const deleteItemId = req.body.deleteItemId;
    //Get listTitle to check which list item is saved on
    const deleteListTitle = req.body.listTitle;
    console.log(deleteListTitle);

    //Check listTitle of item
    //If general: removeById, If dynamic: findAndUpdate + $pull
    if (deleteListTitle==='General'){
        //Delete one item from database and redirect to HOME
        Todo.findByIdAndRemove({_id: deleteItemId}, function(err){
            if (err){
                console.log(err);
            } else {
                console.log(`Item with ID ${deleteItemId} removed`);
                res.redirect("/")
            };
        })
    } else {
        DynamicTodo.findOneAndUpdate({name: deleteListTitle}, {$pull: {items: {_id: deleteItemId}}}, function(err){
            if(err){
                console.log(err);
            } else {
                res.redirect("/" + deleteListTitle)
            }
        })
    }    
});

//Dynamic routing
app.get('/:listName', function(req,res){
    //collect the value entered in link parameter
    const requestedList = _.capitalize(req.params.listName);
    console.log(requestedList);

    //call function to update navbar. Solves problem of repeated code
    searchAndUpdateNavbar()

    //create new document for dynamic collection
    //Check if requested list exists, If not exists, create new list name + blank items + redirect to this page again
    //If exists, retrieve and render list
    DynamicTodo.findOne({name: requestedList}, function(err, foundItem){
        if (!foundItem){
            const newList = new DynamicTodo ({
                name: requestedList,
                items: []
            });
            newList.save();
            console.log(newList);
            res.redirect("/" + requestedList);
        } else {
            res.render("list", {listTitle: foundItem.name, itemList: foundItem.items, dynamicListNames: dynamicListNames})
        }
    })
})

let port = process.env.PORT;
if (port == null || port == "") {
  port = 8000;
}
app.listen(port, function(){
 console.log(`Server active on port ${port}`);
});