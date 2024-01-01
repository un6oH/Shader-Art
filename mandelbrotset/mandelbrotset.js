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
  // canvas.width = 3240;
  // canvas.height = 2160;

  console.log("creating program");
  let program = createProgram(gl, VS, FS);
  let locations = createLocations(gl, program, ["position"], ["centre", "range", "prec", "maxIterations"]);

  let positions = [
    -1, 1, 1, 1, 1, -1, 
    -1, 1, 1, -1, -1, -1,
  ];
  let positionBuffer = makeBuffer(gl, new Float32Array(positions), gl.STATIC_DRAW);

  let centre = [-0.75, 0];
  let xRange = 2 ** 1;
  let yRange = xRange / canvas.width * canvas.height;
  // let range = new Array(2).fill(2 ** -18);
  let range = [xRange, yRange];

  let vertices = new Array(8);
  let i = 0;
  for (let x = -1; x <= 1; x += 2) {
    for (let y = -1; y <= 1; y += 2) {
      vertices[i] = centre[0] + range[0] * x;
      vertices[i + 1] = centre[1] + range[1] * y;
      i += 2;
    }
  }
  console.log("Vertices", vertices);

  let x = Math.max(...vertices.map(n => Math.abs(n)));
  let f = new Float32Array([x]);
  let e = 0;
  while(f[0] != f[0] + 2 ** e) {
    --e;
  }
  e += Math.ceil(Math.log2(Math.max(canvas.width, canvas.height)));
  console.log(e);
  // let prec = 2 ** Math.ceil(Math.log2(range[0]) + 6.0);
  // let prec = 2 ** e;
  let prec = 1;

  let maxIterations = 1000;

  draw(centre, range, prec, maxIterations);

  function draw(centre, range, prec, maxIterations) {
    navigator.clipboard.writeText(centre[0] + "," + centre[1] + "_" + range[0] + "," + range[1] + "_" + prec + "_" + maxIterations);

    gl.useProgram(program);
    gl.viewport(0, 0, canvas.width, canvas.height);
    bindBuffer(gl, positionBuffer, locations.position, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2fv(locations.centre, centre);
    gl.uniform2fv(locations.range, range);
    gl.uniform1f(locations.prec, prec);
    gl.uniform1i(locations.maxIterations, maxIterations);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  let mousePrev = [0, 0];
  let mouseIsPressed = false;

  function planeCoords(mouseCoords) {
    return [
      centre[0] + range[0] * (2 * mouseCoords[0] / canvas.width - 1),
      centre[1] + range[1] * -(2 * mouseCoords[1] / canvas.height - 1)
    ];
  }

  document.addEventListener('mousedown', (event) => {
    mousePrev = planeCoords([event.clientX, event.clientY]);
    // mouseIsPressed = true;
  });

  document.addEventListener('mouseup', (event) => {
    let mousePos = planeCoords([event.clientX, event.clientY]);
    if (mousePos[0] == mousePrev[0] && mousePos[1] == mousePrev[1]) {
      return;
    }
    delta = [mousePos[0] - mousePrev[0], mousePos[1] - mousePrev[1]];
    centre = [centre[0] - delta[0], centre[1] - delta[1]];
    mousePrev = mousePos;
    draw(centre, range, prec, maxIterations);
  });

  document.addEventListener('click', (event) => {
    let mousePos = planeCoords([event.clientX, event.clientY]);
    centre = mousePos;
    draw(centre, range, prec, maxIterations);
  });

  document.addEventListener('keypress', (event) => {
    if (event.key == 'i') {
      prec /= 2;
    } else if (event.key == 'o') {
      prec *= 2;
    }
    console.log("precision = 2 ^ " + Math.log2(prec))
  });

  // document.addEventListener('mousemove', (event) => {
  //   if (!mouseIsPressed) { return; }
  //   console.log("mouse moved");
  //   let mousePos = planeCoords([event.clientX, event.clientY]);
  //   delta = [mousePos[0] - mousePrev[0], mousePos[1] - mousePrev[1]];
  //   centre = [centre[0] - delta[0], centre[1] - delta[1]];
  //   mousePrev = mousePos;
  //   draw(centre, range, prec, maxIterations)
  // });

  document.addEventListener('wheel', (event) => {
    let mousePos = planeCoords([event.clientX, event.clientY]);

    let direction = Math.sign(event.deltaY);
    range = range.map(v => v * 2**direction);

    centre = [centre[0] + direction * (centre[0] - mousePos[0]) * 0.5, centre[1] + direction * (centre[1] - mousePos[1]) * 0.5];
    draw(centre, range, prec, maxIterations);
  });
}

function maxMag(centre, range) {
  let points = [
    centre[0] - range[0], centre[1] - range[1], 
    centre[0] - range[0], centre[1] + range[1], 
    centre[0] + range[0], centre[1] - range[1], 
    centre[0] + range[0], centre[1] + range[1],   
  ];
  let mags = new Array(4).fill(0).map((v, i) => i*2).map((i) => Math.sqrt(points[i]**2 + points[i+1]**2));
  let max = 0;
  for (let i = 0; i < 4; i++) {
    if (mags[i] > max) {
      max = mags[i];
    }
  }
  return max;
}

main();