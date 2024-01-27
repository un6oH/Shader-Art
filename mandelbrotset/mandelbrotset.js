function main() {
  let canvas = document.querySelector("#gl-canvas");

  let gl = canvas.getContext("webgl2");
  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }
  gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('EXT_float_blend');
  gl.getExtension('OES_texture_float_linear');

  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;
  
  const params = {
    centreX: -0.75, 
    centreY: 0, 
    rangeX: 1.25,
    width: 800, 
    height: 800,
    maxIterations: 1000, 
  };

  const inputs = {};

  let range = [];
  function setParams() {
    for (let param in params) {
      let input = document.getElementById(param);
      inputs[param] = input;
      params[param] = parseFloat(input.value);
    }
    range[0] = params.rangeX;
    range[1] = params.rangeX / params.width * params.height;
  }

  function setInputs() {
    ["centreX", "centreY", "rangeX"].forEach((param) => {
      inputs[param].value = params[param];
    });
  }

  console.log("creating program");
  let program = createProgram(gl, VS, FS);
  let locations = createLocations(gl, program, ["position"], ["centre", "range", "prec", "maxIterations"]);
  let positions = [
    -1, 1, 1, 1, 1, -1, 
    -1, 1, 1, -1, -1, -1,
  ];
  let positionBuffer = makeBuffer(gl, new Float32Array(positions), gl.STATIC_DRAW);
  const outputTexture = createTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, params.width, params.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const outputFramebuffer = createFramebuffer(gl, outputTexture);

  let prec = 2 ** -23;
  let minRange = 0;

  function draw() {
    gl.useProgram(program);
    bindBuffer(gl, positionBuffer, locations.position, 2, gl.FLOAT, false, 0, 0);

    let rfCentre = new Float32Array(4);
    rfCentre[1] = params.centreX % prec;
    rfCentre[0] = (params.centreX - rfCentre[1]);
    rfCentre[3] = params.centreY % prec;
    rfCentre[2] = (params.centreY - rfCentre[3]);

    gl.uniform4fv(locations.centre, rfCentre);
    gl.uniform2f(locations.range, range[0], range[1]);
    gl.uniform1f(locations.prec, prec);
    gl.uniform1i(locations.maxIterations, params.maxIterations);
    
    drawTexture(gl, outputFramebuffer, params.width, params.height);
  }

  const displayProgram = createProgram(gl, TEXTURE_VS, TEXTURE_FS);
  const displayLocations = createLocations(gl, displayProgram, ["position"], ["tex"]);
  const displayVertexArray = makeVertexArray(gl, [[positionBuffer, displayLocations.position, 2, gl.FLOAT]]);
  let displayWidth = canvas.width;
  let displayHeight = canvas.height;
  function display(print = false) {
    displayWidth = canvas.width;
    displayHeight = canvas.height;
    if (!print) {
      let clientAspect = canvas.width / canvas.height;
      let outputAspect = params.width / params.height;
      let correctionFactor = clientAspect / outputAspect;
      if (clientAspect < outputAspect) {
        displayHeight *= correctionFactor;
      } else {
        displayWidth /= correctionFactor;
      }
    }

    gl.useProgram(displayProgram);

    gl.bindVertexArray(displayVertexArray);
    bindTextureToLocation(gl, displayLocations.tex, 0, outputTexture);
    
    drawTexture(gl, null, (canvas.width - displayWidth) / 2, (canvas.height - displayHeight) / 2, displayWidth, displayHeight);
  }

  function reset() {
    canvas.width = gl.canvas.clientWidth;
    canvas.height = gl.canvas.clientHeight;
    setParams();
    gl.bindTexture(gl.TEXTURE_2D, outputTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, params.width, params.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    draw();
    display();
  }
  reset();
  const downloadAnchor = document.getElementById("download");
  function screenshot() {
    canvas.width = params.width;
    canvas.height = params.height;
    display(true);
    let url = canvas.toDataURL();
    downloadAnchor.href = url;
    downloadAnchor.download = "mandelbrotset_" + [params.width, params.height].join('x');
    downloadAnchor.click();
    canvas.width = gl.canvas.clientWidth;
    canvas.height = gl.canvas.clientHeight;
    display();
  }

  function planeCoords(mouseCoords) {
    let norm = [
      (mouseCoords[0] - canvas.width / 2) / (displayWidth * 0.5), 
      (mouseCoords[1] - canvas.height / 2) / (displayHeight * -0.5)
    ];
    let plane = [norm[0] * range[0] + params.centreX, norm[1] * range[1] + params.centreY];
    return plane;
  }

  const mouseXOutput = document.getElementById("mouseX");
  const mouseYOutput = document.getElementById("mouseY");
  document.addEventListener('mousemove', (event) => {
    let coords = planeCoords([event.clientX, event.clientY]);
    mouseXOutput.textContent = coords[0];
    mouseYOutput.textContent = coords[1];
  });

  let shiftIsPressed = false;
  document.addEventListener('click', (event) => {
    if (shiftIsPressed) {
      [params.centreX, params.centreY] = planeCoords([event.clientX, event.clientY]);
      setInputs();
      draw();
      display();
    }
  });

  let pmouseX, pmouseY;
  document.addEventListener('mousedown', (event) => {
    if (shiftIsPressed) {
      let coords = planeCoords([event.clientX, event.clientY]);
      pmouseX = coords[0];
      pmouseY = coords[1];
      setInputs();
    }
  });

  document.addEventListener('mouseup', (event) => {
    if (shiftIsPressed) {
      let coords = planeCoords([event.clientX, event.clientY]);
      params.centreX = params.centreX + pmouseX - coords[0]; 
      params.centreY = params.centreY + pmouseY - coords[1];
      setInputs();
      draw();
      display();
    }
  })

  document.addEventListener('keydown', (event) => {
    if (event.key = 'Shift') {
      shiftIsPressed = true;
    }
  });

  document.addEventListener('keyup', (event) => {
    if (event.key = 'Shift') {
      shiftIsPressed = false;
    }
  });

  document.addEventListener('wheel', (event) => {
    let coords = planeCoords([event.clientX, event.clientY]);
    let delta = [
      coords[0] - params.centreX, 
      coords[1] - params.centreY
    ];
    if (event.deltaY > 0) {
      range = range.map((v) => v * 2);
      params.centreX -= delta[0];
      params.centreY -= delta[1];
    } else {
      range = range.map((v) => v / 2);
      params.centreX += delta[0] / 2;
      params.centreY += delta[1] / 2;
    }
    params.rangeX = range[0];
    setInputs();
    draw();
    display();
  });
  
  inputs.maxIterations.addEventListener('input', (event) => {
    params.maxIterations = inputs.maxIterations.value;
    draw();
    display();
  });

  document.getElementById("reset").addEventListener('click', reset);
  document.getElementById("screenshot").addEventListener('click', screenshot);
}

main();