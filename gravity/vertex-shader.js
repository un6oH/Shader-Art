const UPDATE_POSITION_VS = 
`#version 300 es

in vec2 position;
in vec2 velocity;
in float mass;

uniform vec2 canvasDimensions;
uniform vec2 fieldOffset;
uniform sampler2D aoiTexture;
uniform float gravConstant;
uniform float deltaTime;

out vec2 newPosition;
out vec2 newVelocity;

void main() {
  float distance = length(position);
  newPosition = position + velocity;
  newVelocity = velocity + vec2(cos(distance), sin(distance)) / mass;
}
`;

const DRAW_GRAVITY_FIELD_VS = 
`#version 300 es

in vec2 vertexPosition;

uniform vec2 canvasDimensions;
uniform int detail;
uniform float aoiRadius;

out vec2 forceVector;
out float distance;

void main() {
  forceVector = vertexPosition;
  distance = 1.0;
}
`; 

const RENDER_CIRCLES_VS = 
`#version 300 es

in vec2 position;
in vec3 colour;

uniform vec2 canvasDimensions;

out vec3 v_colour;

void main() {

}
`;

const DISPLAY_VS = 
`#version 300 es

in vec2 position;

uniform vec2 canvasDimensions;

void main() {
  
}
`; 