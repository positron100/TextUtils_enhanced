import './App.css';
import Alert from './components/Alert';
import About from './components/About';
import Navbar from './components/Navbar';
import TextForm from './components/TextForm';
import React, { useState } from 'react'

// importing the react-router-dom features
import {
  BrowserRouter as Router,
  Routes,
  Route,
} from "react-router-dom";


function App() {
  const [Mode,setMode]=useState("light");
  const [content,setcontent]=useState("dark mode");
  const [modecolor,setmodecolor]=useState("dark");
  const togglemode=()=>{
    if(Mode==="light")
    {
      setMode("dark");
      setcontent("light mode");
      setmodecolor("light");
      document.body.style.backgroundColor="#042743";
      showAlert("Dark Mode has been enabled","success");
      // changing the title of web application on changing modes
      // document.title="TextUtils - Dark Mode"
    }
    else{
      setMode("light");
      setcontent("dark mode");
      setmodecolor("dark");
      document.body.style.backgroundColor="white";
      showAlert("Dark Mode has been disabled","warning");
      // document.title="TextUtils" 
    }
  }
  // state variable for alert (object) 
  const [alert,setAlert]=useState({M:"",T:""});

  const showAlert=(message,type)=>{
   setAlert({
    M:message,
    T:type
   })

   setTimeout(()=>{
    setAlert({M:"",T:""});
   },1500);
  }
  return (
    // all the code must be in a single tag
    <> 

    <Router>
    {/* Navbar component */}
    <Navbar title="textutils" about="about us" 
    mode={Mode} 
    ToggleMode={togglemode} 
    Content={content}
    textColor={modecolor}/>
    

    {/* Alert component */}
    <Alert alert={alert}/>

    
    <Routes>
      {/* About component */}
      <Route exact path="/About" element={<About/>}></Route>
      
      {/* Text Box component */}

      <Route exact path="/" element={<TextForm heading="Enter the text to analyze : " mode={Mode} showAlert={showAlert}/>}>
      </Route>
    </Routes>
    </Router>    
    </>
  );
}

export default App;
