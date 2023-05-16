// The module 'vscode' contains the VS Code extensibility API
const vscode = require("vscode");
const Provider = require("./provider");

module.exports = {
  activate,
  deactivate,
};

// create a decorator type that we use to decorate small numbers
const numberDecorationType = vscode.window.createTextEditorDecorationType({
  borderWidth: "2px",
  borderStyle: "none none solid none",
  borderRadius: "4px",
  overviewRulerColor: "blue",
  overviewRulerLane: vscode.OverviewRulerLane.Right,
  light: {
    // this color will be used in light color themes
    borderColor: "darkblue",
  },
  dark: {
    // this color will be used in dark color themes
    borderColor: "lightblue",
  },
});

const argsDecorationType = vscode.window.createTextEditorDecorationType({
  borderWidth: "1px",
  borderStyle: "none none dashed none",
  borderRadius: "4px",
  overviewRulerColor: "blue",
  overviewRulerLane: vscode.OverviewRulerLane.Right,
  light: {
    // this color will be used in light color themes
    borderColor: "darkblue",
  },
  dark: {
    // this color will be used in dark color themes
    borderColor: "lightblue",
  },
});
let timeout;
let activeEditor;

// This method is called when your extension is activated
function activate(context) {
  console.log("hover provider example is active");

  let disposable1 = vscode.languages.registerHoverProvider("toylang", {
    provideHover(document, position, token) {
      const word = document.getText(document.getWordRangeAtPosition(position));
      console.error(word, word.length, position);
            
      let description = "Unknown"
      if (word == "=") description = "Assignment: takes one argument. 1: a unique constant name";
      if (word == "set_list_item") description = "Constant: takes one argument. 1: the expression to assign to it";
      if (word == "\\") description = "Function Definition: takes n arguments. 1: zero or more argument types. 2: one return type ending with a => symbol. 3: a series of expressions ending in a return expression";

      const contents = new vscode.MarkdownString(
        `${word}: ${description}`
      );

      contents.isTrusted = true;

      return new vscode.Hover(contents);
    },
  });

  let disposable2 = vscode.languages.registerCodeLensProvider(
    "*",
    new Provider()
  );

  let commandID = "example.show";

  // the codelens passes 2 arguments to the command when it is executed
  let disposable3 = vscode.commands.registerCommand(
    commandID,
    (lineNum, text) => {
      vscode.window.showInformationMessage(
        `We are on line ${lineNum}. The is the text: ${text}`
      );
    }
  );

  context.subscriptions.push(disposable1);
  context.subscriptions.push(disposable2);
  context.subscriptions.push(disposable3);

//

  console.log("decorator example is active");

  activeEditor = vscode.window.activeTextEditor;

  if (activeEditor) {
    triggerUpdateDecorations();
  }

  vscode.window.onDidChangeActiveTextEditor(
    (editor) => {
      activeEditor = editor;
      if (editor) {
        triggerUpdateDecorations();
      }
    },
    null,
    context.subscriptions
  );

  vscode.workspace.onDidChangeTextDocument(
    (event) => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations(true);
      }
    },
    null,
    context.subscriptions
  );


}


function updateDecorations() {
  if (!activeEditor) {
    return;
  }

  const regEx = /=/g;
  const regEx2 = /set_list_item/g;
  const text = activeEditor.document.getText();

  const numbers = [];
  const args = [];

  let match;

  while ((match = regEx.exec(text))) {
    const startPos = activeEditor.document.positionAt(match.index);
    const endPos = activeEditor.document.positionAt(match.index + match[0].length);

    const decoration = {
      range: new vscode.Range(startPos, endPos),
      hoverMessage: "Assignment **" + match[0] + "** (2 args)",
    };

    numbers.push(decoration);
  }

  while ((match = regEx2.exec(text))) {
    const startPos = activeEditor.document.positionAt(match.index);
    const endPos = activeEditor.document.positionAt(match.index + match[0].length);

    const decoration = {
      range: new vscode.Range(startPos, endPos),
      hoverMessage: "Arg 1 of 1 **" + match[0] + "**",
    };

    args.push(decoration);
  }

  activeEditor.setDecorations(numberDecorationType, numbers);
  activeEditor.setDecorations(argsDecorationType, args);
}

function triggerUpdateDecorations(throttle = false) {
  if (timeout) {
    clearTimeout(timeout);
    timeout = undefined;
  }

  if (throttle) {
    timeout = setTimeout(updateDecorations, 500);
  } else {
    updateDecorations();
  }
}

// this method is called when your extension is deactivated
function deactivate() {}