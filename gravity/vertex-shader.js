const UPDATE_FIELD_VS = `#version 300 es
precision highp float;

in vec2 position; // position for canvasVertices
in vec2 centre; // centre position of body in field coords
in float mass; // mass of body
in vec2 velocity;

uniform vec2 fieldDimensions;

out vec2 v_centre;
out float v_mass;
out float bodyRadius;
out vec2 toCentre;
out vec2 v_velocity;

void main() {
  gl_Position  = vec4(position, 0, 1);

  v_centre = centre;
  v_mass = mass;
  bodyRadius = sqrt(mass) / distanceUnit;

  vec2 fieldCoords = (position + 1.0) * 0.5 * fieldDimensions;
  vec2 toCentre = centre - fieldCoords;
`;

const UPDATE_BODIES_VS = `#version 300 es
precision highp float;

in vec2 i_position; // position in texture coords
in vec2 i_velocity;

uniform sampler2D forceField;
uniform float g;
uniform float deltaTime;
uniform vec2 canvasDimensions;

out vec2 o_position;
out vec2 o_velocity;

void main() {
  vec2 velocity = i_velocity;

  vec2 texCoord = i_position / canvasDimensions * vec2(1, -1) + vec2(0, 1);
  vec2 fieldValue = texture(field, i_position / canvasDimensions).xy;

  vec2 acc = fieldValue * g;

  velocity += acc * deltaTime;

  o_position = mod(mod(i_position + velocity * deltaTime, canvasDimensions) + canvasDimensions, canvasDimensions);
  o_velocity = velocity;
}
`;

const UPDATE_SET_VS = `#version 300 es
precision highp float;

void main() {

}
`;

const DRAW_BODIES_VS = `#version 300 es
precision highp float;

in vec2 position;
in float mass;

uniform vec2 canvasDimensions;

void main() {
  vec2 normCoords = position / canvasDimensions;
  vec2 clipSpace = normCoords * 2.0 - 1.0;

  gl_Position = vec4(clipSpace, 0, 1);
  gl_PointSize = sqrt(mass);
}
`;

const DISPLAY_VS = `#version 300 es
precision highp float;

in vec2 position;

out vec2 texCoords;

void main() {
  gl_Position = vec4(position, 0, 1);
  texCoords = position * 0.5 + 0.5;
}
`;