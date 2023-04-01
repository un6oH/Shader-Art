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

void main() {

}
`;

const DRAW_GRAVITY_FIELD_VS = 
`#version 300 es

in vec2 vertexPosition;

uniform vec2 canvasDimensions;
uniform int detail;
uniform float aoiRadius;

out vec2 force;
out float distance;

void main() {

}
`; 

const DISPLAY_VS = 
`#version 300 es

in vec2 position;
in vec3 colour;

uniform vec2 canvasDimensions;

out vec3 colour;

void main() {
  
}
`; 