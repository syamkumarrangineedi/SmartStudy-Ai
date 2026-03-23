import { useEffect, useState } from "react";

function Sidebar(){

  const [user,setUser] = useState("");

  useEffect(()=>{
    const name = localStorage.getItem("user");
    setUser(name);
  },[]);

  return(

    <div style={{
      width:"250px",
      background:"linear-gradient(180deg,#4f46e5,#06b6d4)",
      color:"white",
      padding:"20px",
      minHeight:"100vh"
    }}>

      <h2>AI Assistant</h2>

      <h3>👤 {user || "Guest"}</h3>

      <hr/>

      <h4>Analytics</h4>
      <p>Score: 75%</p>
      <p>Level: Intermediate</p>

    </div>
  );
}

export default Sidebar;