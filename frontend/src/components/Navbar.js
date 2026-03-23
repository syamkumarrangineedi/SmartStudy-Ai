import { Link } from "react-router-dom";

function Navbar(){

  const user = localStorage.getItem("user");

  return(

    <div style={{
      background:"#4f46e5",
      padding:"15px",
      display:"flex",
      justifyContent:"space-between"
    }}>

      <h3>AI Assistant</h3>

      <div style={{display:"flex",gap:"15px"}}>

        <Link to="/dashboard">Home</Link>
        <Link to="/chat">Chat</Link>
        <Link to="/quiz">Quiz</Link>
        <Link to="/upload">Upload</Link>

      </div>

      <span>{user}</span>

    </div>
  );
}

export default Navbar;