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

  const initialDensity = images[0];
  const initialVelocity = images[1];
  const boundaries = images[2];
  
  // set texture size to input image size
  const textureWidth = initialDensity.width;
  const textureHeight = initialDensity.height;
  const wrapTexture = [true, true];
  
  console.log("Simulating " + textureWidth + ", " + textureHeight + " grid, output to " + canvas.width + ", " + canvas.height + " canvas");

  // initialise programs and data locations
  const initialiseProgram = createProgram(gl, BUFFER_VERT, INITIALISE_FRAG);
  const initialiseData = {
    position: gl.getAttribLocation(initialiseProgram, "a_position"),
    resolution: gl.getUniformLocation(initialiseProgram, "u_resolution"),
  };
  const addSourceProgram = createProgram(gl, BUFFER_VERT, ADD_SOURCE);
  const diffuseProgram = createProgram(gl, BUFFER_VERT, DIFFUSE_FRAG);
  const advectProgram = createProgram(gl, BUFFER_VERT, ADVECT_FRAG);
  const projectProgram = createProgram(gl, BUFFER_VERT, PROJECT_FRAG);
  const displayProgram = createProgram(gl, CANVAS_VERT, DISPLAY_FRAG);

  // create position buffer
  const positionBuffer = gl.createBuffer(gl.ARRAY_BUFFER);

  // create textures
  const initialDensityTexture = createAndSetupTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, );

  function initialise() {
    gl.useProgram(initialiseProgram);

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(initialiseData.position, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(initialiseData.resolution, textureWidth, textureHeight);

  }

  function addSource() {

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

function createAndSetupTexture(gl, wrapTexture = [false, false]) {
  let texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapTexture[0] ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapTexture[1] ? gl.REPEAT : gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  return texture;
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