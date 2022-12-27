const SET_FIELD = 0;
const SET_INPUT = 1;
const UPDATE = 2;
const DISPLAY = 3;

function render(images) {
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
  
  // set texture size to input image size
  const textureWidth = image.width;
  const textureHeight = image.height;
  const wrapTexture = [isPowerOfTwo(textureWidth), isPowerOfTwo(textureHeight)];
  // const wrapTexture = [false, false];
  
  console.log("Simulating " + textureWidth + ", " + textureHeight + " grid, output to " + canvas.width + ", " + canvas.height + " canvas");

  // initialise programs
  const initialiseProgram = createProgram(gl, BUFFER_VERT, INITIALISE_FRAG);
  const addSourceProgram = createProgram(gl, BUFFER_VERT, ADD_SOURCE);
  const diffuseProgram = createProgram(gl, BUFFER_VERT, DIFFUSE_FRAG);
  const advectProgram = createProgram(gl, BUFFER_VERT, ADVECT_FRAG);
  const projectProgram = createProgram(gl, BUFFER_VERT, PROJECT_FRAG);
  const displayProgram = createProgram(gl, CANVAS_VERT, DISPLAY_FRAG);


  // buffers
  const positionBuffer = gl.createBuffer(gl.ARRAY_BUFFER);
  const texCoordBuffer = gl.createBuffer(gl.ARRAY_BUFFER);

  // get data locations
  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  const texCoordAttributeLocation = gl.getAttribLocation(program, "a_texCoord");
  
  const canvasResolutionUniformLocation = gl.getUniformLocation(program, "u_canvasResolution");
  const textureResolutionUniformLocation = gl.getUniformLocation(program, "u_textureResolution");
  const modeUniformLocation = gl.getUniformLocation(program, "u_mode");
  const deltaTimeUniformLocation = gl.getUniformLocation(program, "u_deltaTime");
  
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
  const inputImageTexture = createAndSetupTexture(gl);
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
  let currentFrameBuffer = 1;
  const deltaTime = 0.05;
  gl.uniform1f(deltaTimeUniformLocation, deltaTime);
  // requestAnimationFrame(animate);
  function animate() {
    if (frame % framesPerUpdate === 0) {
      // update cells by drawing to a framebuffer
      update();
      
      // draw to canvas
      draw();
    }

    ++frame;
    requestAnimationFrame(animate);
  }

  // initialise texture with input image
  function initialise() {
    setFramebuffer(framebuffers[currentFrameBuffer], textureWidth, textureHeight);
    gl.bindTexture(gl.TEXTURE_2D, inputImageTexture);
    gl.uniform1i(modeUniformLocation, SET_FIELD);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setRectangle(gl, 0, 0, image.width, image.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    setRectangle(gl, 0, 0, textureWidth, textureHeight);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // add input
    gl.uniform1i(modeUniformLocation, SET_INPUT);
    setInput();

    gl.bindTexture(gl.TEXTURE_2D, textures[currentFrameBuffer]);
    currentFrameBuffer = 0;
  }

  function update() {
    // console.log("update()");
    // draw previous state
    setFramebuffer(framebuffers[currentFrameBuffer], textureWidth, textureHeight);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setRectangle(gl, 0, 0, textureWidth, textureHeight);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    setRectangle(gl, 0, 0, textureWidth, textureHeight);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // add force and source input
    gl.uniform1i(modeUniformLocation, SET_INPUT);
    setInput();

    gl.bindTexture(gl.TEXTURE_2D, textures[currentFrameBuffer]);

    switchFrameBuffer();
  }

  function switchFrameBuffer () {
    currentFrameBuffer = currentFrameBuffer == 0 ? 1 : 0;
    setFramebuffer(framebuffers[currentFrameBuffer], textureWidth, textureHeight);
  }

  // display to canvas
  function draw() {
    setFramebuffer(null, canvas.width, canvas.height);
    gl.uniform1i(modeUniformLocation, DISPLAY);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    setRectangle(gl, 0, 0, canvas.width, canvas.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    setRectangle(gl, 0, 0, textureWidth, textureHeight);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }
  
  // set framebuffer and viewport
  function setFramebuffer(fbo, width, height) { 
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  function setInput() {

  }

  function addForce(x, y, width, height, dx, dy) {

  }

  function addSource(x, y, width, height, d) {

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

function createAndSetupTexture(gl, wrapTexture = [false, false]) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapTexture[0] ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapTexture[1] ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return texture;
}

function isPowerOfTwo(n) {
  for (let x = n; x > 1; x /= 2) {
    if (Math.floor(x) != x) {
      return false;
    }
  }
  return true;
}

function loadImage(url, callback) {
  let image = new Image();
  image.src = url;
  image.onload = callback;
  return image;
}

function loadImages(urls, callback) {
  let images = [];
  let imagesToLoad = urls.length;

  const onImageLoad = () => {
    --imagesToLoad;

    if (imagesToLoad == 0) {
      callback(images);
    }
  }

  for (let i = 0; i < imagesToLoad; ++i) {
    let image = loadImage(urls[i], onImageLoad);
    images.push(image);
  }
}

function main() {
  loadImages([
    "../fluidsim/initial-density.png",
    "../fluidsim/initial-velocity.png",
    "../fluidsim/boundaries",
  ], render);
}

main();