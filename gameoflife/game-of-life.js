function render(image) {
  // initialise canvas
  const canvas = document.querySelector("#gl-canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }

  // set canvas size to client canvas size
  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;
  const gridWidth = image.width;
  const gridHeight = image.height;
  console.log("Simulating " + gridWidth + ", " + gridHeight + " grid");

  // program
  const updateProgram = createProgram(gl, TEXTURE_VS, UPDATE_FS);
  const updateProgramLocations = createLocations(gl, updateProgram, ["position"], ["invertTexture", "grid", "gridSize"]);

  const displayProgram = createProgram(gl, TEXTURE_VS, DRAW_TEXTURE_FS);
  const displayProgramLocations = createLocations(gl, displayProgram, ["position"], ["invertTexture", "image"])

  // buffers and vertex array
  const positionBuffer = makeBuffer(gl, new Float32Array([
    0, 0, 1, 0, 1, 1, 
    0, 0, 1, 1, 0, 1
  ]), gl.STATIC_DRAW);
  const updateVertexArray = makeVertexArray(gl, [[positionBuffer, updateProgramLocations.position, 2, gl.FLOAT]]);
  const displayVertexArray = makeVertexArray(gl, [[positionBuffer, displayProgramLocations.position, 2, gl.FLOAT]]);

  // framebuffers and textures
  const originalImageTexture = createTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image); // put image.png in the texture;
  
  const textures = [];
  const framebuffers = [];
  for (let i = 0; i < 2; ++i) {
    let texture = createTexture(gl, [gl.NEAREST, gl.NEAREST, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gridWidth, gridHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    textures.push(texture);
      
    let framebuffer = createFramebuffer(gl, texture);
    framebuffers.push(framebuffer);
  }

  // initialise texture with input image
  function initialise() {
    gl.useProgram(displayProgram);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[0]);
    gl.viewport(0, 0, gridWidth, gridHeight);

    gl.bindVertexArray(displayVertexArray);
    gl.bindTexture(gl.TEXTURE_2D, originalImageTexture);
    gl.uniform1i(displayProgramLocations.invertTexture, 1);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    step = 0;
  }

  function update() {
    gl.useProgram(updateProgram);

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers[(step + 1) % 2]);
    gl.viewport(0, 0, gridWidth, gridHeight);

    gl.bindVertexArray(updateVertexArray);
    gl.bindTexture(gl.TEXTURE_2D, textures[step % 2]);
    gl.uniform2f(updateProgramLocations.gridSize, gridWidth, gridHeight);

    gl.drawArrays(gl.TRIANGLES, 0, 6);

    step ++;
  }

  function display(print) {
    let width = canvas.width;
    let height = canvas.height;
    if (!print) {
      let clientAspect = canvas.width / canvas.height;
      let outputAspect = gridWidth / gridHeight;
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
    gl.bindTexture(gl.TEXTURE_2D, textures[step % 2]);
    
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  // animation 
  let framesPerUpdate = 6;
  let frame = 1;
  let step = 0;
  let play = false;
  requestAnimationFrame(animate);
  function animate() {
    if (!play) {
      return;
    }

    if (frame % framesPerUpdate === 0) {
      // update cells by drawing to a framebuffer
      update();
      
      // draw to canvas
      display(false);
    }

    frame ++;
    requestAnimationFrame(animate);
  }
  
  function reset() {
    initialise();
    display(false);
    play = false;
  }
  reset();

  //
  // interactivity
  //
  const downloadAnchor = document.querySelector("#download-link");
  function screenshot() {
    canvas.width = gridWidth;
    canvas.height = gridHeight;
    display(true);
    let url = canvas.toDataURL();
    downloadAnchor.href = url;
    downloadAnchor.download = "game of life_" + [gridWidth, gridHeight].join('x');
    downloadAnchor.click();
    canvas.width = gl.canvas.clientWidth;
    canvas.height = gl.canvas.clientHeight;
    display(false);
  }

  const resetButton = document.querySelector("#reset");
  const playToggle = document.querySelector("#playpause");
  const fpsInput = document.querySelector("#fps");
  const fpsOutput = document.querySelector("#fps-output");
  const screenshotButton = document.querySelector("#screenshot");
  fpsOutput.textContent = fpsInput.value;

  resetButton.addEventListener('click', reset);
  playToggle.addEventListener('click', () => {
    play = !play;
    if (play) {
      animate();
    }
  });
  screenshotButton.addEventListener('click', screenshot);

  fpsInput.addEventListener('input', () => {
    framesPerUpdate = Math.floor(60 / parseFloat(fpsInput.value));
    fpsOutput.textContent = fpsInput.value;
  });

  document.addEventListener('keypress', (event) => {
    if (event.key == ' ') {
      play = !play;
      if (play) {
        animate();
      }
    }
  })
}

function main() {
  const image = new Image();
  image.src = "image.png";
  image.onload = () => {
    render(image);
  }
}

main();