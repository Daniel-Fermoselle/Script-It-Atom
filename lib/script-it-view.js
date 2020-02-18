'use babel';

export default class ScriptItView {

  constructor(serializedState) {
    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('script-it');



//TODO make this code better, compact and pretty
    // Create message element
    const message = document.createElement('p');
   message.setAttribute("align", "center");
   message.setAttribute("style", "font-size:20px");
   message.innerHTML = "This is ScriptIt! package help page" + "&#9786;"

   const messageBody = document.createElement('p');
   messageBody.textContent = "Here we describe every command you may need:";

   const messageExtract = document.createElement('p');
   messageExtract.textContent = "ctrl+alt+e: Extract the algorithm representing the model in the application.";

   const messageActivateHighlight = document.createElement('p');
   messageActivateHighlight.textContent = "alt+a: Activates the highlighting capabilities of this tool after the code extraction.";

   const messageReverseHighlighting = document.createElement('p');
   messageReverseHighlighting.textContent = "alt+h: Highlight the code lines representing the shapes highlighted in the digital modelling application.";

   const messageHighlightToggle = document.createElement('p');
   messageHighlightToggle.textContent = "ctrl+shift+t: Activate and deactivate the highlight/traceability features.";

   const messageFreeForAllRefactorToggle = document.createElement('p');
   messageFreeForAllRefactorToggle.textContent = "ctrl+alt+a: Activate and deactivate the free for all refactor with traceability toggle.";

   const messageTraceToggle = document.createElement('p');
   messageTraceToggle.textContent = "ctrl+alt+c: Toggle between control flow or last call mode.";

   const messageHelpPanel = document.createElement('p');
   messageHelpPanel.textContent = "ctrl+alt+h: Open and close this help panel.";

   const messageExtractFunction = document.createElement('p');
   messageExtractFunction.textContent = "ctrl+alt+m: Extract a function from the lines with cursors.";

   message.classList.add('message');
   this.element.appendChild(message);
   this.element.appendChild(messageBody);
   this.element.appendChild(messageHelpPanel);
   this.element.appendChild(messageExtract);
   this.element.appendChild(messageHighlightToggle);
   this.element.appendChild(messageReverseHighlighting);
   this.element.appendChild(messageTraceToggle);
   this.element.appendChild(messageFreeForAllRefactorToggle);
   this.element.appendChild(messageExtractFunction);

  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

}
