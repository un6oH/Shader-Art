const UPDATE_POSITION_VS = `#version 300 es

in vec2 position;
in vec2 direction;

uniform sampler2D velocityAoiMap; // TEXTURE0
uniform sampler2D positionAoiMap; // TEXTURE1
uniform float deltaTime;
uniform float speed;
uniform float separationF;
uniform float alignmentF;
uniform float cohesionF;
uniform vec2 canvasDimensions; // constant
uniform vec2 aoiMapDimensions; // constant

out vec2 newPosition;
out vec2 newVelocity;

void main() {

}
`;
 
const DRAW_VELOCITY_AOI_VS = `#version 300 es

in vec2 position;

uniform vec2 velocity;
uniform vec2 canvasDimensions; // constant
uniform vec2 aoiMapDimensions; // constant

void main() {

}
`;
 
const DRAW_POSITION_AOI_VS = `#version 300 es

in vec2 position;

uniform vec2 centre;
uniform vec2 canvasDimensions; // constant
uniform vec2 aoiMapDimensions; // constant

void main() {

}
`;

const DISPLAY_VS = `#version 300 es

in vec2 position;
in vec3 colour;

uniform vec2 canvasDimensions; // constant
uniform vec2 aoiMapDimensions; // constant

void main() {
  
}
`;
