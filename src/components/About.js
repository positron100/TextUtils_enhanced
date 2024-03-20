import React,{useState} from 'react'

export default function About() {
    // state variable to change css of the Accordion
    const [MyStyle,setMyStyle]=useState({
        color:'white',
        backgroundColor:"black"
    })
    // state variable to change the text of button
    const [Text,setMyText]=useState("Dark Mode");


    // state variable to change the css of button
  

    // function to enable dark mode and light mode
    const toggleStyle=()=>{
        if(MyStyle.color==="white")
        {
            setMyStyle({
                color:"black",
                backgroundColor:"white"
            })
            setMyText("Dark Mode");
        }
        else{
            setMyStyle({
                color:"white",
                backgroundColor:"#042743"
            })
            setMyText("Light Mode");
        }
    }
  return (
    <>
    <div className="container my-3">
    <div className="accordion" id="accordionExample">
  <div className="accordion-item">
    <h2 className="accordion-header">
      <button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#collapseOne" aria-expanded="true" aria-controls="collapseOne">
      Our Mission
      </button>
    </h2>
    <div id="collapseOne" className="accordion-collapse collapse show" data-bs-parent="#accordionExample" style={MyStyle}>
      <div className="accordion-body">
      We are a team of dedicated developers committed to simplifying text manipulation and refining processes through innovative tools. Our mission is to empower users with efficient and enjoyable text editing experiences.
      </div>
    </div>
  </div>
  <div className="accordion-item">
    <h2 className="accordion-header">
      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">
       Innovative Technology
      </button>
    </h2>
    <div id="collapseTwo" className="accordion-collapse collapse" data-bs-parent="#accordionExample" style={MyStyle}>
      <div className="accordion-body">
      Leveraging cutting-edge React technology, our application offers dynamic and responsive text processing capabilities. From basic formatting to advanced features like regex pattern matching and word count analysis, our utility is designed to meet diverse user needs with precision.
      </div>
    </div>
  </div>
  <div className="accordion-item">
    <h2 className="accordion-header">
      <button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseThree" aria-expanded="false" aria-controls="collapseThree">
      User-Centric Design
      </button>
    </h2>
    <div id="collapseThree" className="accordion-collapse collapse" data-bs-parent="#accordionExample" style={MyStyle}>
      <div className="accordion-body">
      Understanding the uniqueness of each user, our application provides customizable settings and features to cater to individual preferences. Whether it's increasing productivity, improving writing accuracy, or streamlining workflows, our text utility is tailored to support users at every stage, ensuring a seamless and personalized experience.
      </div>
    </div>
  </div>
</div>
    </div>

    <div className="container">
    <button className="btn btn-primary" 
    onClick={toggleStyle}>
        {Text}
    </button>    
    </div>
    </>
  )
}
