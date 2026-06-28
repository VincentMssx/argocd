// 1. Declare the type on the global window object
declare global {
  interface Window {
    env?: {
      envName: string;
    };
  }
}

// 2. Log to console (you see this in F12)
console.log("Hello world !");

// 3. Add to the page (you see this in the browser window)
const currentEnv = window.env?.envName || "LOCAL";

const app = document.querySelector('body');
if (app) {
  const newElement = document.createElement("p");
  newElement.textContent = `Hello World! Current environment: ${currentEnv}`;
  app.appendChild(newElement);
}