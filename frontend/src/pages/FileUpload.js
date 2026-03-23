import { useState } from "react";
import { uploadFile } from "../services/api";

function FileUpload(){

  const [file,setFile] = useState(null);

  const upload = async () => {

    const formData = new FormData();
    formData.append("file",file);

    await uploadFile(formData);

    alert("Uploaded");
  };

  return(

    <div className="container">

      <div className="card">

        <h2>Upload PDF</h2>

        <input type="file" onChange={(e)=>setFile(e.target.files[0])}/>

        <button onClick={upload}>Upload</button>

      </div>

    </div>
  );
}

export default FileUpload;