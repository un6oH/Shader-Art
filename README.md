# Shader art

Various visualisations, simulations, and image manipulation using WebGL2.

## Introduction

I started this project to make images that look cool. I had seen videos about GPU acceleration (mostly from @SebastianLague on YouTube), and I wanted to try writing graphics programs myself. GPU acceleration allows you to do parallel calculations several times faster than on the CPU, making it ideal for image processing and simulation.

The programs were made with the goal of generating images to use as wallpapers.

## Methods

The project is web-based because it's what I'm familiar with, and because I don't need to wait around for an app to build.

The programs are scripted through the WebGL2 rendering context and written in GLSL. I learned WebGL through the tutorials on [WebGL2Fundamentals](https://webgl2fundamentals.org/), and used [MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext/) and [docs.gl](https://docs.gl/) as references. 

The webpages are written in HTML, JS, and GLSL, and run locally. 

## The Programs

The programs are a mix of interactive and hacky. Some parameters are available in the web page, while some require you to run the webpage from your computer and change the image files to create your own pictures.

All programs allow you to download the full res image that you create.

### Conway's Game of Life

The classic. Requires a black and white image named image.png in the folder.

[Game of life example](/thumbnails/gameoflife.gif)

### Continuous life

Cellular automata based on continuous values. Requires a greyscale image named image.png in the folder. Some interactive parameters.

*A dedicated GPU is recommended for high-res images.

[Continuous life example](/thumbnails/continuouslife.gif)

### Boids

Flocking/herding simulation with a time complexity of O(n) thanks to textures. Fully interactive!

[Boids example](/thumbnails/boids.gif)

### Mandelbrot set

Controlled entirely by mouse and keyboard.

Much higher zooms are possible than a basic Mandelbrot generator through the use of recursive floating point numbers. 

[Mandelbrot example](/thumbnails/mandelbrot.gif)

### Recolourer

Can recolour greyscale images with a variety of preset colour maps and gradients. Allows you to change the parameters and test your own settings.

[Recolourer example](/thumbnails/recolourer.gif)

