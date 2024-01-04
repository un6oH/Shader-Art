# Shader art
Various visualisations, simulations, and image manipulations using WebGL.
By Hogun Lim
## Why?
idk they look cool. \(._.)/
I started this project because I had seen videos about GPU acceleration (mostly from Sebastian Lague - @SebastianLague on YouTube), and I wanted to try writing graphics programs myself. 
The project is web-based because it's what I'm familiar with, and because I don't need to spend time for an app to build. As a fun bonus, you can try some programs on the GitHub page.
The programs are focused around generating images and wallpapers.
## The Programs
The programs are a mix of interactive and hacky. Some parameters are available in the web page, while some programs require you to change the image files to create your own pictures.
All programs allow you to download the full res image that you create (WIP). Downloads will go to the default downloads folder.
### Conway's Game of Life
The classic. The only input is a black and white image.
### Smooth life (WIP)
Cellular automata based on continuous values. Allows custom image input. Some interactive parameters.
### Boids (WIP)
Flocking simulation. Fully interactive!
Using some gpu tricks, this simulation has a time complexity of O(n)
### Fluid simulation (WIP)
Fluid simulation based on Kass, M. and Miller, G., 1990. Rapid, Stable Fluid Dynamics for Computer Graphics. 10.1145/97879.97884.
Some mouse interactivity, some interactive parameters. Three image file inputs.
### Mandelbrot set (WIP)
Controlled entirely by mouse
Much higher zooms are possible than a basic Mandelbrot generator through the use of recursive floating point numbers. 
Each number is represented by g + 2^t * f, where g is the gross component, f is the fine component, and t is the threshold exponent.
