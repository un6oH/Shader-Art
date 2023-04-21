const UPDATE_POSITION_VS = 
`#version 300 es

in vec2 position;
in vec2 velocity;

uniform vec2 gravityFieldDimensions;
uniform vec2 canvasOffset;
uniform sampler2D gravityFieldTexture;
uniform float gravConstant;
uniform float deltaTime;

out vec2 newPosition;
out vec2 newVelocity;

void main() {
  vec2 fieldCoords = position + canvasOffset;
  vec2 texCoords = fieldCoords / gravityFieldDimensions;
  vec2 extInfluence = texture(gravityFieldTexture, texCoords).xy;

  vec2 force = gravConstant * extInfluence * 1000.0;

  newVelocity = velocity + force * deltaTime;
  newPosition = position + newVelocity * deltaTime;
}
`;

const DRAW_GRAVITY_FIELD_VS = 
`#version 300 es

in vec2 vertexPosition;

uniform vec2 gravityFieldDimensions;
uniform vec2 canvasOffset;
uniform vec2 centre;
uniform float radius;

out vec2 pointToCentre;
out float distance;

void main() {
  vec2 fieldCoords = vertexPosition + canvasOffset;
  vec2 normCoords = fieldCoords / gravityFieldDimensions;
  vec2 clipSpace = normCoords * 2.0 - 1.0;
  gl_Position = vec4(clipSpace, 0.0, 1.0);

  int vertexId = gl_VertexID % 72;
  int point = vertexId % 3;

  pointToCentre = (centre - vertexPosition);
  distance = (point == 0) ? 0.0 : radius;
}
`; 

const RENDER_CIRCLES_VS = 
`#version 300 es

in vec2 position;
in vec3 colour;

uniform vec2 canvasDimensions;

out vec3 v_colour;

void main() {
  vec2 normCoords = position / canvasDimensions;
  vec2 clipSpace = normCoords * 2.0 - 1.0;

  gl_Position = vec4(clipSpace * vec2(1.0, -1.0), 0.0, 1.0);
  v_colour = colour / 255.0;
}
`;

const DISPLAY_VS = 
`#version 300 es

in vec2 position;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`; 