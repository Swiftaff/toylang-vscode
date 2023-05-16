import {
    createConnection,
    TextDocuments,
    TextDocumentItem,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    DidChangeConfigurationNotification,
    CompletionItem,
    CompletionItemKind,
    TextDocumentPositionParams,
    TextDocumentSyncKind,
    InitializeResult,
} from "vscode-languageserver/node";

import { TextDocumentContentChangeEvent } from "vscode-languageserver-protocol";

import { TextDocument } from "vscode-languageserver-textDocument";

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

documents.onDidChangeContent((event) => {
    console.log("test");
    validateTextDocument(event.document);
});

function validateTextDocument(textDocument: TextDocument): void {
    let text = textDocument.getText();
    let pattern = /\bthe\b/g;
    let match;
    let diagnostics: Diagnostic[] = [];

    while ((match = pattern.exec(text))) {
        let diagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Warning,
            range: {
                start: textDocument.positionAt(match.index),
                end: textDocument.positionAt(match.index + match[0].length),
            },
            message: `${match[0]} is highlighted`,
            source: "the-highlighter",
        };
        diagnostics.push(diagnostic);
    }

    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

connection.onInitialize((params: InitializeParams) => {
    return {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental,
        },
    };
});

connection.onDidChangeConfiguration((change) => {
    documents.all().forEach(validateTextDocument);
});

documents.listen(connection);

connection.listen();
