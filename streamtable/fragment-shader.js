// display functions
const DRAW_SEDIMENT = 
`#version 300 es
precision highp float;



void main() {

}
`

const DRAW_WATER = 
`#version 300 es
precision highp float;

void main() {

}
`

//
// simulation functions
// 
// water

// sediment transport
const EROSION_FS = 
`#version 300 es
precision highp float;

in vec2 v_texCoord;

uniform int layer;

layout(location = 0) out vec4 sediment;
layout(location = 1) out float height;
layout(location)

float random(vec2 co){
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  ivec2 texCoord = int(v_texCoord);

  float height = texelFetch(heightTexture, texCoord);

  // calculate particle suspension factor
  
  // calculate probability of suspension
}
`