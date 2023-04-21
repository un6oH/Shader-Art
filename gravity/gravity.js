function main() {
  // initialise canvas
  const canvas = document.querySelector("#gl-canvas");
  const gl = canvas.getContext("webgl2");
  if (!gl) { 
    alert("Unable to initialise WebGL"); 
    return; 
  }
  gl.getExtension('EXT_color_buffer_float');
  gl.getExtension('EXT_float_blend');
  gl.getExtension('OES_texture_float_linear');

  canvas.width = gl.canvas.clientWidth;
  canvas.height = gl.canvas.clientHeight;

  //
  // create simulation
  //
  function createSimulation(preset = null) {
    if (preset) {
      let simulation = JSON.parse()
    }

    let width = gl.canvas.clientWidth;
    let height = gl.canvas.clientHeight; 

    let simulation = {
      "gravConstant": 1000, 
      "steps": 240, 
      "fieldDimensions": [width * 2, height * 2], 
      "canvasDimensions": [width, height], 
      "bodies": [],
    }; 
    for (let i = 0; i < 10; ++i) {
      let mass = random(10, 500);
      let angle = random(0, Math.PI * 2);
      let velocityDirection = random(0, Math.PI * 2);
      simulation.bodies.push({
        mass: mass, 
        position: [Math.cos(angle) * 100 + width / 2, Math.sin(angle) * 100 + height / 2], 
        velocity: [Math.cos(velocityDirection) * random(50, 100), Math.sin(velocityDirection) * random(50, 100), ], 
        size: Math.sqrt(mass), 
        colour: [random(0, 255), random(0, 255), random(0, 255)]
      })
    }  

    console.log(JSON.stringify(simulation));

    simulation.millisPerStep = 1000 / simulation.steps;
    simulation.stepCount = 0;
    simulation.runTime = 0;
    simulation.timeSimulated = 0;

    return simulation;
  }

  let simulation = createSimulation();

  // 
  // initialise programs
  // 
  // update position program
  console.log("creating update position program");
  const updatePositionProgram = createProgram(gl, UPDATE_POSITION_VS, UPDATE_POSITION_FS, ["newPosition", "newVelocity"]);
  gl.useProgram(updatePositionProgram);
  const updatePositionLocations = {
    position: gl.getAttribLocation(updatePositionProgram, "position"), 
    velocity: gl.getAttribLocation(updatePositionProgram, "velocity"), 
    gravityFieldDimensions: gl.getUniformLocation(updatePositionProgram, "gravityFieldDimensions"), 
    canvasOffset: gl.getUniformLocation(updatePositionProgram, "canvasOffset"), 
    gravityFieldTexture: gl.getUniformLocation(updatePositionProgram, "gravityFieldTexture"), 
    gravConstant: gl.getUniformLocation(updatePositionProgram, "gravConstant"), 
    deltaTime: gl.getUniformLocation(updatePositionProgram, "deltaTime"), 
  }
  gl.uniform1i(updatePositionLocations.gravityFieldTexture, 0);

  const position1Buffer = gl.createBuffer();
  const position2Buffer = gl.createBuffer();
  const velocity1Buffer = gl.createBuffer();
  const velocity2Buffer = gl.createBuffer();
  
  const updatePositionVertexArray1 = makeVertexArray(gl, [
    [position1Buffer, updatePositionLocations.position, 2, gl.FLOAT], 
    [velocity1Buffer, updatePositionLocations.velocity, 2, gl.FLOAT], 
  ]);
  const updatePositionVertexArray2 = makeVertexArray(gl, [
    [position2Buffer, updatePositionLocations.position, 2, gl.FLOAT], 
    [velocity2Buffer, updatePositionLocations.velocity, 2, gl.FLOAT], 
  ]);
  
  const updatePositionTransformFeedback1 = makeTransformFeedback(gl, [position2Buffer, velocity2Buffer]);
  const updatePositionTransformFeedback2 = makeTransformFeedback(gl, [position1Buffer, velocity1Buffer]);
  
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, null);
  
  let current = {
    vertexArray: updatePositionVertexArray1, 
    transformFeedback: updatePositionTransformFeedback1, 
    outputPositionBuffer: position2Buffer,
    outputVelocityBuffer: velocity2Buffer, 
  };
  let next = {
    vertexArray: updatePositionVertexArray2, 
    transformFeedback: updatePositionTransformFeedback2, 
    outputPositionBuffer: position1Buffer,
    outputVelocityBuffer: velocity1Buffer, 
  };

  // draw gravity field program
  console.log("creating draw gravity field program");
  const drawGravityFieldProgram = createProgram(gl, DRAW_GRAVITY_FIELD_VS, DRAW_GRAVITY_FIELD_FS);
  gl.useProgram(drawGravityFieldProgram);
  const drawGravityFieldLocations = {
    vertexPosition: gl.getAttribLocation(drawGravityFieldProgram, "vertexPosition"),
    gravityFieldDimensions: gl.getUniformLocation(drawGravityFieldProgram, "gravityFieldDimensions"), 
    canvasOffset: gl.getUniformLocation(drawGravityFieldProgram, "canvasOffset"), 
    centre: gl.getUniformLocation(drawGravityFieldProgram, "centre"), 
    radius: gl.getUniformLocation(drawGravityFieldProgram, "radius"), 
    mass: gl.getUniformLocation(drawGravityFieldProgram, "mass"), 
  }
  const aoiVertexBuffer = gl.createBuffer();
  const drawGravityFieldVertexArray = makeVertexArray(gl, [[aoiVertexBuffer, drawGravityFieldLocations.vertexPosition, 2, gl.FLOAT]]);
  const gravityFieldTexture = createTexture(gl);
  const gravityFieldFrameBuffer = createFramebuffer(gl, gravityFieldTexture);

  // render programs
  // circles
  console.log("creating render circles program");
  const renderCirclesProgram = createProgram(gl, RENDER_CIRCLES_VS, RENDER_CIRCLES_FS);
  gl.useProgram(renderCirclesProgram);
  const renderCirclesLocations = {
    position: gl.getAttribLocation(renderCirclesProgram, "position"), 
    colour: gl.getAttribLocation(renderCirclesProgram, "colour"), 
    canvasDimensions: gl.getUniformLocation(renderCirclesProgram, "canvasDimensions"), 
  }
  const vertexBuffer = gl.createBuffer();
  const colourBuffer = gl.createBuffer();
  const renderVertexArray = makeVertexArray(gl, [
    [vertexBuffer, renderCirclesLocations.position, 2, gl.FLOAT], 
    [colourBuffer, renderCirclesLocations.colour, 3, gl.FLOAT], 
  ]);

  // spheres
  // code for rendering spheres
  

  // display program;
  console.log("creating display program");
  const displayProgram = createProgram(gl, DISPLAY_VS, DISPLAY_FS);
  gl.useProgram(displayProgram);
  const displayLocations = {
    position: gl.getAttribLocation(displayProgram, "position"), 
    canvasDimensions: gl.getUniformLocation(displayProgram, "canvasDimensions"), 
    image: gl.getUniformLocation(displayProgram, "image"), 
  }
  gl.uniform1i(displayLocations.image, 0);
  const displayPositionBuffer = gl.createBuffer();
  const displayVertexArray = makeVertexArray(gl, [[displayPositionBuffer, displayLocations.position, 2, gl.FLOAT]]);
  gl.bindBuffer(gl.ARRAY_BUFFER, displayPositionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 1, 1, 1, -1, -1, 1, 1, 1, -1]), gl.STATIC_DRAW);
  const outputTexture = createTexture(gl);
  const outputFramebuffer = createFramebuffer(gl, outputTexture);

  //
  // create scene
  //
  function createScene(simulation) {
    const scene = new Object();
    scene.positions = new Float32Array(simulation.n * 24 * 3 * 2); // n bodies, detail segments, 3 vertices, 2 dimensions
    scene.colours = [];
    for (let b = 0; b < simulation.n; ++b) {
      scene.colours.push(new Array(72).fill(0).map(() => simulation.colours[b]).flat());
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, colourBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(scene.colours.flat()), gl.STATIC_DRAW);

    scene.model = new Float32Array(circleMesh);

    return scene;
  }

  let scene;

  //
  // set simulation
  //
  function setSimulation() {
    // canvas
    let width = canvas.width;
    let height = canvas.height;
    simulation.fieldDimensions = [width * 2, height * 2];
    simulation.canvasDimensions = [width, height];
    simulation.canvasOffset = [
      (simulation.fieldDimensions[0] - simulation.canvasDimensions[0]) / 2, 
      (simulation.fieldDimensions[1] - simulation.canvasDimensions[1]) / 2, 
    ]
    console.log("setSimulation() canvasDimensions", simulation.canvasDimensions, "fieldDimensions", simulation.fieldDimensions);

    simulation.maxVelocity = 200;

    // update positions
    simulation.n = simulation.bodies.length;
    simulation.positions = new Float32Array(simulation.n * 2);
    simulation.velocities = new Float32Array(simulation.n * 2);
    simulation.masses = new Float32Array(simulation.n);
    simulation.sizes = new Array(simulation.n);
    simulation.colours = new Array(simulation.n);
    simulation.radii = new Array(simulation.n);

    simulation.maxMass = 0;
    simulation.bodies.forEach((body, i) => {
      let x = i * 2;
      let y = x + 1;

      simulation.positions[x] = body.position[0];
      simulation.positions[y] = body.position[1];
      simulation.velocities[x] = body.velocity[0];
      simulation.velocities[y] = body.velocity[1];
      simulation.masses[i] = body.mass;
      if (body.mass > simulation.maxMass) { simulation.maxMass = body.mass; }

      simulation.sizes[i] = body.size;
      simulation.colours[i] = body.colour;
    });
    simulation.masses.forEach((mass, i) => {
      simulation.radii[i] = Math.sqrt(simulation.gravConstant * mass * simulation.maxMass)
    });

    console.log("setSimulation() \ninitial positions", simulation.positions, 
    "\ninitial velocities", simulation.velocities, 
    "\ninitial masses", simulation.masses, 
    "radii", simulation.radii);

    gl.bindBuffer(gl.ARRAY_BUFFER, position1Buffer); gl.bufferData(gl.ARRAY_BUFFER, simulation.positions, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, position2Buffer); gl.bufferData(gl.ARRAY_BUFFER, simulation.positions, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, velocity1Buffer); gl.bufferData(gl.ARRAY_BUFFER, simulation.velocities, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, velocity2Buffer); gl.bufferData(gl.ARRAY_BUFFER, simulation.velocities, gl.DYNAMIC_DRAW);

    gl.useProgram(updatePositionProgram);
    gl.uniform2fv(updatePositionLocations.canvasDimensions, simulation.canvasDimensions);
    gl.uniform2fv(updatePositionLocations.canvasOffset, simulation.canvasOffset);

    // gravity field
    gl.useProgram(drawGravityFieldProgram);
    gl.uniform2fv(drawGravityFieldLocations.gravityFieldDimensions, simulation.fieldDimensions);
    gl.uniform2fv(drawGravityFieldLocations.canvasOffset, simulation.canvasOffset)

    gl.bindTexture(gl.TEXTURE_2D, gravityFieldTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, ...simulation.fieldDimensions, 0, gl.RGBA, gl.FLOAT, null);

    // render
    gl.useProgram(renderCirclesProgram);
    gl.uniform2fv(renderCirclesLocations.canvasDimensions, simulation.canvasDimensions);

    // display
    gl.useProgram(displayProgram);
    gl.uniform2fv(displayLocations.canvasDimensions, simulation.canvasDimensions);


    gl.bindTexture(gl.TEXTURE_2D, outputTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, ...simulation.canvasDimensions, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  
    // scene
    scene = createScene(simulation);

    simulation.play = false;
 
    // render(); 
  }

  setSimulation();

  function resetSimulation() {
    simulation = createSimulation();
    setSimulation();
    render();
  }

  //
  // simulation functions
  //
  function updatePositions(deltaTime) {
    // gl.useProgram(updatePositionProgram);

    // gl.bindVertexArray(current.vertexArray);
    // gl.uniform1f(updatePositionLocations.gravConstant, simulation.gravConstant);
    // gl.uniform1f(updatePositionLocations.deltaTime, deltaTime);

    // gl.activeTexture(gl.TEXTURE0);
    // gl.bindTexture(gl.TEXTURE_2D, gravityFieldTexture);
    // gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // gl.enable(gl.RASTERIZER_DISCARD);
    // gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, current.transformFeedback);
    // gl.beginTransformFeedback(gl.POINTS);

    // gl.drawArrays(gl.POINTS, 0, simulation.n);

    // gl.endTransformFeedback();
    // gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
    // gl.disable(gl.RASTERIZER_DISCARD);

    let tempPositions = new Array(simulation.n * 2);
    let tempVelocities = new Array(simulation.n * 2);

    for (let b = 0; b < simulation.n; ++b) {
      let totalForce = [0, 0];
      let x = b * 2;
      let y = x + 1;
      for (let i = 0; i < simulation.n; ++i) {
        let x1 = i * 2;
        let y1 = x1 + 1
        if (b == i) {
          continue;
        }
        let v = [
          simulation.positions[x1] - simulation.positions[x], 
          simulation.positions[y1] - simulation.positions[y], 
        ];
        let distance = Math.sqrt(v[0] * v[0] + v[1] * v[1]);
        v = v.map((value) => value / distance);
        let rSquared = distance * distance;
        force = simulation.gravConstant * simulation.masses[i] / rSquared; 

        totalForce[0] = totalForce[0] + v[0] * force;
        totalForce[1] = totalForce[1] + v[1] * force;
      }

      tempVelocities[x] = simulation.velocities[x] + totalForce[0] * deltaTime;
      tempVelocities[y] = simulation.velocities[y] + totalForce[1] * deltaTime;
      tempPositions[x] = simulation.positions[x] + tempVelocities[x] * deltaTime;
      tempPositions[y] = simulation.positions[y] + tempVelocities[y] * deltaTime;
    }


    for (let b = 0; b < simulation.n; ++b) {
      let x = b * 2;
      let y = x + 1;

      simulation.velocities[x] = tempVelocities[x];
      simulation.velocities[y] = tempVelocities[y];

      simulation.positions[x] = tempPositions[x];
      simulation.positions[y] = tempPositions[y];
    }


  }

  function drawGravityField() {
    let vertices = new Array(simulation.n * 24 * 3 * 2);
    for(let b = 0; b < simulation.n; ++b) { // circle c of n
      let x = simulation.positions[b * 2];
      let y = simulation.positions[b * 2 + 1];

      for (let p = 0; p < circleMesh.length; p += 2) {
        vertices[b * circleMesh.length + p]     = x + circleMesh[p] * simulation.radii[b];
        vertices[b * circleMesh.length + p + 1] = y + circleMesh[p + 1] * simulation.radii[b];
      }
    }
    
    gl.useProgram(drawGravityFieldProgram);
    
    gl.bindVertexArray(drawGravityFieldVertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, aoiVertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    gl.bindFramebuffer(gl.FRAMEBUFFER, gravityFieldFrameBuffer);
    gl.viewport(0, 0, ...simulation.fieldDimensions);
    gl.clearBufferfv(gl.COLOR, 0, new Float32Array([0, 0, 0, 1]));

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.blendEquationSeparate(gl.FUNC_ADD, gl.MAX);
    for (let b = 0; b < simulation.n; ++b) {
      gl.uniform2f(drawGravityFieldLocations.centre,  simulation.positions[b * 2], simulation.positions[b * 2 + 1]);
      gl.uniform1f(drawGravityFieldLocations.radius, simulation.radii[b]);
      gl.uniform1f(drawGravityFieldLocations.mass, simulation.masses[b]);
      
      gl.drawArrays(gl.TRIANGLES, b * 24 * 3, 24 * 3);
    }

    gl.disable(gl.BLEND);
  }

  //
  // display functions
  //
  function render() {
    console.log("render()");
    gl.useProgram(renderCirclesProgram);

    gl.bindVertexArray(renderVertexArray);

    for (let b = 0; b < simulation.n; ++b) { // body b
      let x = simulation.positions[b * 2];
      let y = simulation.positions[b * 2 + 1];
      let size = simulation.sizes[b];
      for (let v = 0; v < circleMesh.length; v += 2) { // vertex v
        scene.positions[b * scene.model.length + v] = scene.model[v] * size + x;
        scene.positions[b * scene.model.length + v + 1] = scene.model[v + 1] * size + y;
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, scene.positions, gl.STATIC_DRAW);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, ...simulation.canvasDimensions);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, simulation.n * 24 * 3);
  }

  function display() {
    gl.useProgram(displayProgram);

    gl.bindVertexArray(displayVertexArray);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, gravityFieldTexture);
    gl.uniform2fv(displayLocations.canvasDimensions, simulation.canvasDimensions);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, ...simulation.canvasDimensions);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  //
  // master functions
  //
  
  function step(deltaTime) {
    // drawGravityField();
    updatePositions(deltaTime);

    simulation.timeSimulated += simulation.millisPerStep;

    // gl.bindBuffer(gl.ARRAY_BUFFER, current.outputPositionBuffer);
    // gl.getBufferSubData(gl.ARRAY_BUFFER, 0, simulation.positions);
    // gl.bindBuffer(gl.ARRAY_BUFFER, current.outputVelocityBuffer);
    // gl.getBufferSubData(gl.ARRAY_BUFFER, 0, simulation.velocities);

    // let temp = current;
    // current = next;
    // next = temp;

    console.log(simulation.runTime, simulation.timeSimulated);
  }

  function manualStep() {
    step(0.2);
    display();
  }
  // document.addEventListener("click", manualStep);

  let then = 0;
  
  function animate(time) {
    if (!simulation.play) {
      console.log("-+- stopped animation -+-");
      return;
    }
    let deltaTime = time - then;
    console.log("deltaTime", deltaTime)
    simulation.runTime += deltaTime;

    while (simulation.runTime > simulation.timeSimulated) {
      step(simulation.millisPerStep * 0.001);
    }
    render();

    then = time;

    requestAnimationFrame(animate);
  }
  
  function playPause() {
    simulation.play = !simulation.play;
    if (simulation.play) {
      console.log("-+- started animation -+-")
      let time = performance.now();
      then = time;
      animate(time);
    }
  }

  function keyPress(event) {
    if (event.key == ' ') {
      playPause();
    } else if (event.key == "Enter") {
      resetSimulation();
    }
  }
  document.addEventListener("keypress", keyPress);
}

const angleIncrement = Math.PI / 12;
const circleMesh = new Array(24).fill(0).map((v, i) => {
    return angleIncrement * i;
  }).map((angle) => {
    let angle0 = angle;
    let angle1 = angle + angleIncrement;
    return [0, 0, 
            Math.cos(angle0), Math.sin(angle0), 
            Math.cos(angle1), Math.sin(angle1)
           ];
  }).flat();

function random(min, max) {
  return Math.random() * (max - min) + min;
}

main();