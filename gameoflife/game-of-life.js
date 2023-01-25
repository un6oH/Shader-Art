function render(image) {
  // initialise canvas
  const canvas = document.querySelector("#gl-canvas");
  const gl = canvas.getContext("webgl");
  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }

  // set canvas size to client canvas size
  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;

  // initialise program
  const vertexShaderSource = VERTEX_SHADER;
  const fragmentShaderSource = FRAGMENT_SHADER;
  const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  // set texture size to input image size
  const textureWidth = image.width;
  const textureHeight = image.height;
  const wrapTexture = false;

  console.log("Simulating " + textureWidth + ", " + textureHeight + " grid, output to " + canvas.width + ", " + canvas.height + " canvas")

  // buffers
  const positionBuffer = gl.createBuffer(gl.ARRAY_BUFFER);
  const texCoordBuffer = gl.createBuffer(gl.ARRAY_BUFFER);

  // get data locations
  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  const texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");
  
  const canvasResolutionUniformLocation = gl.getUniformLocation(program, "u_canvasResolution");
  const textureResolutionUniformLocation = gl.getUniformLocation(program, "u_textureResolution");
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
    let texture = createAndSetupTexture(gl, wrapTexture);
    textures.push(texture);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null);
      
    let framebuffer = gl.createFramebuffer();
    framebuffers.push(framebuffer);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  }

  // set resolution uniforms
  gl.uniform2f(canvasResolutionUniformLocation, canvas.width, canvas.height);
  gl.uniform2f(textureResolutionUniformLocation, textureWidth, textureHeight);

  //
  // draw
  //
  gl.clearColor(0, 0, 0, 1);

  // load initial texture
  initialise();

  // display original texture
  draw();

  // animation 
  const framesPerUpdate = 1;
  let frame = 1;
  let step = 0;
  requestAnimationFrame(animate);
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

  // initialise texture with input image
  function initialise() {
    setFramebuffer(framebuffers[1], textureWidth, textureHeight);
    gl.bindTexture(gl.TEXTURE_2D, originalImageTexture);
    gl.uniform1i(updateCellsUniformLocation, 0);
    gl.uniform1i(displayUniformLocation, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setRectangle(gl, 0, 0, image.width, image.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    setRectangle(gl, 0, 0, 1, 1);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindTexture(gl.TEXTURE_2D, textures[1]);
  }

  function update() {
    // console.log("update()");

    setFramebuffer(framebuffers[step % 2], textureWidth, textureHeight);
    gl.uniform1i(updateCellsUniformLocation, 1);
    gl.uniform1i(displayUniformLocation, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setRectangle(gl, 0, 0, textureWidth, textureHeight);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    setRectangle(gl, 0, 0, 1, 1);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.bindTexture(gl.TEXTURE_2D, textures[step % 2]);

    step ++;
  }

  // display to canvas
  function draw() {
    setFramebuffer(null, canvas.width, canvas.height);
    gl.uniform1i(updateCellsUniformLocation, 0);
    gl.uniform1i(displayUniformLocation, 1);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setRectangle(gl, 0, 0, canvas.width, canvas.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    setRectangle(gl, 0, 0, 1, 1);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  
  // set framebuffer and viewport
  function setFramebuffer(fbo, width, height) { 
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);
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

function createAndSetupTexture(gl, wrapTexture) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapTexture ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapTexture ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return texture;
}

function main() {
  const image = new Image();
  image.src = "../image.png";
  image.onload = () => {
    render(image);
  }
}

main();