function render(image) {
  // initialise canvas
  const canvas = document.querySelector("#gl-canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }

  const params = {
    deltaTime: 0.0167, 
    cellRadius: 10, 
    neighbourRadius: 30, 
    birthLower: 0.31, 
    birthUpper: 0.45, 
    deathLower: 0.25, 
    deathUpper: 0.5, 
    transitionSmoothRadius: 0.1, 
    lifeSmoothRadius: 0.1,
  }
  const textureWidth = image.width;
  const textureHeight = image.height;

  const inputs = {};
  for (let parameter in params) {
    let input = document.getElementById(parameter)
    input.addEventListener('input', () => {
      params[parameter] = parseFloat(input.value);
    });
    inputs[parameter] = input;
  }
  for (let parameter of ["deltaTime", "birthLower", "birthUpper", "deathLower", "deathUpper", "transitionSmoothRadius", "lifeSmoothRadius"]) {
    let output = document.getElementById(parameter + "Output");
    let input = inputs[parameter];
    output.textContent = input.value;
    input.addEventListener('input', () => {
      output.textContent = input.value;
    });
  }
  

  // set canvas size to client canvas size
  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;

  // initialise program
  const updateProgram = createProgram(gl, TEXTURE_VS, UPDATE_FS);
  const updateProgramLocations = createLocations(gl, updateProgram, 
    ["position"], 
    ["flipTexture", "image", "deltaTime", "textureDimensions", "cellRadius", "neighbourRadius", "birthLower", "birthUpper", "deathLower", "deathUpper", "transitionSmoothRadius", "lifeSmoothRadius"]
  );
  
  const displayProgram = createProgram(gl, TEXTURE_VS, DISPLAY_FS);
  const displayProgramLocations = createLocations(gl, displayProgram, ["position"], ["flipTexture", "image"]);


  // buffers
  const positionBuffer = gl.createBuffer(gl.ARRAY_BUFFER);
  setupBuffer(gl, positionBuffer, new Float32Array([
    0, 0, 1, 0, 1, 1, 
    0, 0, 1, 1, 0, 1
  ]), gl.STATIC_DRAW);

  // vertex arrays
  const updateVertexArray = makeVertexArray(gl, [[positionBuffer, updateProgramLocations.position, 2, gl.FLOAT]]);
  const displayVertexArray = makeVertexArray(gl, [[positionBuffer, displayProgramLocations.position, 2, gl.FLOAT]]);

  // bind textures to framebuffers
  const textures = [];
  const framebuffers = [];
  for (let i = 0; i < 2; ++i) {
    let texture = createTexture(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, textureWidth, textureHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    textures.push(texture);
      
    let framebuffer = createFramebuffer(gl, texture);
    framebuffers.push(framebuffer);
  }

  // initialise texture with input image
  function initialise() {
    canvas.width = gl.canvas.clientWidth;
    canvas.height = gl.canvas.clientHeight;

    gl.bindTexture(gl.TEXTURE_2D, textures[0]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    step = 0;
  }

  function update() {
    gl.useProgram(updateProgram);
    setFramebuffer(gl, framebuffers[(step + 1) % 2], textureWidth, textureHeight);

    gl.bindVertexArray(updateVertexArray);
    gl.uniform1i(updateProgramLocations.flipTexture, false);
    gl.bindTexture(gl.TEXTURE_2D, textures[step % 2]);
    gl.uniform2f(updateProgramLocations.textureDimensions, textureWidth, textureHeight);
    for (let parameter in params) {
      gl.uniform1f(updateProgramLocations[parameter], params[parameter]);
    }

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    step ++;
  }

  // display to canvas
  function display(print = false) {
    let width = canvas.width;
    let height = canvas.height;
    if (!print) {
      let clientAspect = canvas.width / canvas.height;
      let outputAspect = textureWidth / textureHeight;
      let correctionFactor = clientAspect / outputAspect;
      if (clientAspect < outputAspect) {
        height *= correctionFactor;
      } else {
        width /= correctionFactor;
      }
    }

    gl.useProgram(displayProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport((canvas.width - width) / 2, (canvas.height - height) / 2, width, height);

    gl.bindVertexArray(displayVertexArray);
    gl.uniform1i(displayProgramLocations.flipTexture, true);
    gl.bindTexture(gl.TEXTURE_2D, textures[step % 2]);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  // animation 
  let step = 0;
  let play = false;
  initialise();
  display();
  function animate() {
    if (!play) {
      return;
    }
    update();
    display();
    requestAnimationFrame(animate);
  }

  const downloadAnchor = document.getElementById("download-anchor");
  function screenshot() {
    canvas.width = textureWidth;
    canvas.height = textureHeight;
    display(true);
    let url = canvas.toDataURL();
    downloadAnchor.href = url;
    downloadAnchor.download = "smoothLife_" + [textureWidth, textureHeight].join('x') + "_" + Object.values(params).join('-');
    downloadAnchor.click();
    canvas.width = gl.canvas.clientWidth;
    canvas.height = gl.canvas.clientHeight;
    display();
  }

  const resetButton = document.getElementById("reset");
  resetButton.addEventListener('click', () => {
    initialise();
    display();
    play = false;
    playButton.textContent = "Start";
  });
  const playButton = document.getElementById("playpause");
  playButton.addEventListener('click', () => {
    play = !play;
    playButton.textContent = play ? "Stop" : "Start";
    if (play) {
      requestAnimationFrame(animate);
    }
  });
  const screenshotButton = document.getElementById("screenshot");
  screenshotButton.addEventListener('click', screenshot);
}

function main() {
  let image = new Image();
  image.src = "image.png";
  image.onload = () => render(image);
}

main();