const vscode = require("vscode");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const fetch = require("node-fetch");

let timeout;
let activeEditor;
let diagnosticCollection;

// This method is called when your extension is activated
async function activate(context) {
    console.log("Toylang VS Code Extension: starting server on http://localhost:12345");
    try {
        const response = await fetch("http://localhost:12345/test");
        const body = await response.body();
        if (body) {
            server_is_started = true;
        }
    } catch (e) {
        startServer();
    }

    setTimeout(() => {
        activeEditor = vscode.window.activeTextEditor;
        if (activeEditor) triggerUpdateDecorations("extension activated");

        let disposable_for_tab_switch = vscode.window.onDidChangeActiveTextEditor((editor) => {
            activeEditor = editor;
            triggerUpdateDecorations("tab switched", true);
        });

        let disposable_for_doc_edited = vscode.workspace.onDidSaveTextDocument((event) => {
            triggerUpdateDecorations("doc changed", true);
        });

        diagnosticCollection = vscode.languages.createDiagnosticCollection("toylang_vscode");

        context.subscriptions.push(disposable_for_tab_switch);
        context.subscriptions.push(disposable_for_doc_edited);
        context.subscriptions.push(diagnosticCollection);
    }, 5000);
}

function triggerUpdateDecorations(text, throttle = false) {
    if (timeout) {
        clearTimeout(timeout);
        timeout = undefined;
    }
    if (throttle) timeout = setTimeout(updateDecorations, 500);
    else updateDecorations();
}

async function updateDecorations() {
    const document = activeEditor.document;
    if (activeEditor && document.languageId === "toylang") {
        const uri = document.uri.fsPath;
        try {
            const response = await fetch("http://localhost:12345/parse?filepath=" + uri);
            console.log(response);
            const jsonOutput = await response.json();

            diagnosticCollection.delete(document.uri);

            if (jsonOutput.errors && Array.isArray(jsonOutput.errors)) {
                const items = [];
                jsonOutput.errors.forEach((error, error_index) => {
                    if (Array.isArray(error) && error.length == 2) {
                        const error_text = error[0];
                        const error_token = error[1];
                        if (
                            Array.isArray(error_token) &&
                            error_token.length == 4 &&
                            typeof error_token[0] == "string" &&
                            typeof error_token[1] == "number" &&
                            typeof error_token[2] == "number" &&
                            typeof error_token[3] == "number"
                        ) {
                            const diagnosticRange = new vscode.Range(
                                new vscode.Position(error_token[1], error_token[2]), // Start position
                                new vscode.Position(error_token[1], error_token[3] + 1) // End position
                            );
                            const diagnosticItem = new vscode.Diagnostic(
                                diagnosticRange, // The range of the error
                                error_text, // The error message
                                vscode.DiagnosticSeverity.Error // The severity of the error
                            );
                            diagnosticItem.relatedInformation = [
                                new vscode.DiagnosticRelatedInformation(
                                    new vscode.Location(document.uri, diagnosticRange),
                                    error_text
                                ),
                            ];
                            items.push(diagnosticItem);
                        }
                    }
                });
                diagnosticCollection.set(document.uri, items);
            }
        } catch (err) {
            console.log(`updateDecorations parse error: ${err}`);
        }
    }
}

async function startServer() {
    const command = "toylang.exe -s -i none";
    const { stdout, stderr } = await exec(command);
    if (stderr) {
        return stderr;
    }
    return stdout;
}

async function kill_toylang() {
    const appName = "toylang.exe";
    await exec(`taskkill /im ${appName} /t /F`, (err, stdout, stderr) => {
        if (err) {
            return err;
        }
        if (stderr) {
            return stderr;
        }
        return stdout;
    });
}

// this method is called when your extension is deactivated
async function deactivate() {
    // TODO kill toylang server on deactivate
    await kill_toylang();
}

module.exports = { activate, deactivate };
