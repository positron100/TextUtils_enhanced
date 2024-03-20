// rfc : react function based component
import React, { useState } from "react";
// useState allows you to create a state variable
export default function TextForm(props) {

  // **** function to convert the text into uppercase ****
  const uppercase = () => {
    // console.log("uppercase was called");
    let newtext = text.toUpperCase();
    setText(newtext);
  }
  // **** function to convert the text into lowercase ****
  const lowercase = () => {
    let newtext = text.toLowerCase();
    setText(newtext);
  }
  // **** function to clear all the text ****
  const clearall=()=>{
    let newtext="";
    setText(newtext);
  }

  // **** function to copy hte text ****
  const copytext=()=>{
    console.log("copytext function called");
    let newtext = document.getElementById("exampleFormControlTextarea1");
    newtext.select();
    navigator.clipboard.writeText(newtext.value);
  }
  // **** function to remove all the extra spaces ****
  const removeExtraSpace=()=>{
    console.log("removeExtraSpace function was called");
    let newtext=text.split(/[ ]+/);
    setText(newtext.join(" "));
  }

  // **** indicating that the state variable is changing ****
  const handleOnChange = (event) => {
    console.log("OnChange was clicked");
    setText(event.target.value);
  }

  


  // always keep this inside your function component

  const [text, setText] = useState('');
  // text="new text"; (wrong way to change the text variable)
  // setText("newtext"); (correct way to change the text variable)

  // statement to count no. of words
  let words = text.split(/[ ]+/).length - 1;
  return (
    <>
      <div className="container" style={{color: props.mode==="dark"?"white":"black"}}>
        <div className="mb-3 my-3">
          <label htmlFor="exampleFormControlTextarea1" className="form-label">
            <h4>{props.heading}</h4>
          </label>
          <textarea
            
            value={text}
            onChange={handleOnChange} // neccessary to update the state variable
            className="form-control"
            id="exampleFormControlTextarea1"
            rows="8"
            style={{backgroundColor: props.mode==="dark"?"grey":"white", color: props.mode==="dark"?"white":"black",fontSize: "20px", fontFamily: "Poppins,sans-serif" }}
          ></textarea>
          

          <button className="btn btn-primary my-3 mx-2" onClick={uppercase}>UpperCase</button>

          <button className="btn btn-danger my-3 mx-2" onClick={lowercase}>LowerCase</button>

          <button className="btn btn-success my-3 mx-2" onClick={clearall}>Clear</button>

          <button className="btn btn-warning my-3 mx-2" onClick={copytext}>copy</button>

          <button className="btn btn-info my-3 mx-2" onClick={removeExtraSpace}>Extra Space</button>
        </div>
      </div>
      <div className="container" style={{color: props.mode==="dark"?"white":"black"}}>
        <p>Your Text Summary : </p>
        {/* let words = text.split(/[ ]+/).length - 1; */}
        <p>{words} words and {text.length} characters</p>
      </div>
    </>
  );
}
