function render(image) {
  // initialise canvas
  const canvas = document.querySelector("#gl-canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }
  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;

  // initialise program
  const vertexShaderSource = VERTEX_SHADER;
  const fragmentShaderSource = FRAGMENT_SHADER;
  const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  // app
  const simWidth = 1024;
  const simHeight = 1024;
  let translation = [0, 0];
  let scale = 1;

  // create position buffer
  const positionBuffer = gl.createBuffer(gl.ARRAY_BUFFER);

  // texture coordinates
  const texCoordBuffer = gl.createBuffer(gl.ARRAY_BUFFER);

  // get data locations
  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  const texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");
  
  const simSizeUniformLocation = gl.getUniformLocation(program, "u_simSize");
  const canvasResolutionUniformLocation = gl.getUniformLocation(program, "u_canvasResolution");
  const updateCellsUniformLocation = gl.getUniformLocation(program, "u_updateCells");
  const displayUniformLocation = gl.getUniformLocation(program, "u_display");
  
  //
  // render time
  //
  // set up canvas
  gl.useProgram(program);

  // position pointer
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  // texture coordinate pointer
  gl.enableVertexAttribArray(texCoordAttributeLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.vertexAttribPointer(texCoordAttributeLocation, 2, gl.FLOAT, false, 0, 0);

  
  // create framebuffers and textures
  const originalImageTexture = createAndSetupTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); // put image.png in the texture;
  
  const textures = [];
  const framebuffers = [];
  for (let i = 0; i < 2; ++i) {
    let texture = createAndSetupTexture(gl);
    textures.push(texture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, image.width, image.height, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null);
      
      let framebuffer = gl.createFramebuffer();
      framebuffers.push(framebuffer);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  }
    
  gl.uniform2f(simSizeUniformLocation, simWidth, simHeight);

  //
  // draw
  //
  gl.clearColor(0, 0, 0, 1);

  loadSim();

  // start with original image
  // draw();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  setRectangle(gl, 0, 0, canvas.width, canvas.height);

  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  setRectangle(gl, 0, 0, 1, 1);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.uniform2f(canvasResolutionUniformLocation, canvas.width, canvas.height);
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // animation 
  const framesPerUpdate = 1;
  let frame = 1;
  let step = 0;
  // requestAnimationFrame(animate);
  function animate() {
    if (frame % framesPerUpdate === 0) {
      // update cells by drawing to a framebuffer
      update();

      // draw to canvas
      draw();
    }

    frame ++;
    requestAnimationFrame(animate);
  }

  // update the cells by applying the rule
  function loadSim() {
    gl.clear();

    gl.bindTexture(gl.TEXTURE_2D, originalImageTexture);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setRectangle(gl, 0, 0, image.width, image.height);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    setRectangle(gl, 0, 0, 1, 1);

    setFramebuffer(framebuffers[1], simWidth, simHeight);
    
    gl.uniform1i(displayUniformLocation, 0);
    gl.uniform1i(updateCellsUniformLocation, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindTexture(gl.TEXTURE_2D, textures[1]);

    console.log("loadSim() image save loaded");
  }

  function update() {
    // console.log("update()")
    gl.clear();
    gl.viewport(0, 0, simWidth, simHeight);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.setRectangle(gl, -1, 1, 2, -2);

    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.setRectangle(gl, 0, 0, 1, 1);
    
    // draw to framebuffer
    setFramebuffer(framebuffers[step % 2], image.width, image.height);
    gl.uniform1i(updateCellsUniformLocation, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindTexture(gl.TEXTURE_2D, textures[step % 2]);

    step ++;
  }

  // display to canvas, with translation and scaling
  function draw() {
    gl.clear();
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.setRectangle();

    setFramebuffer(null, canvas.width, canvas.height); // todo: replace with standalone uniform and viewport settings
    gl.uniform1i(updateCellsUniformLocation, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  
  // set framebuffer and viewport
  function setFramebuffer(fbo, width, height) { 
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.uniform2f(simSizeUniformLocation, width, height);
    gl.viewport(0, 0, width, height);
  }
}

function createShader(gl, type, source) {
  let shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) { return shader; }

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
  let vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
  let fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  
  let program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  let success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) { return program; }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function setRectangle(gl, x, y, width, height) {
  let x1 = x;
  let y1 = y;
  let x2 = x + width;
  let y2 = y + height;
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      x1, y1, 
      x2, y1, 
      x2, y2, 
      x1, y1, 
      x2, y2, 
      x1, y2
    ]),
    gl.STATIC_DRAW);
}

function createAndSetupTexture(gl) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return texture;
}

function main() {
  const image = new Image();
  image.src = "../gameoflife/image.png";
  image.onload = () => {
    render(image);
  }
}

main();