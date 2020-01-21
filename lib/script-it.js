'use babel';

import ScriptItView from './script-it-view';
import { CompositeDisposable } from 'atom';

//Global Vars
var funcCounter = 1;//func number counter to forbid functions with the same name
var highlightedMarker = null;
var highlightedMarkersList = [];
var highlightToggle = false;
var reverseHighlightInProgress = false;
var actualJuliaClient = null;
var actualJuliaClientIPC = null;
var currentEditor = null;
var currentCursor = null;
var rangeList = null;
var addCursorDispose = null;
var changePositionDispose = null;
var changeEditorDispose = null;
var changingTextEditorMessageSuppressed = true;
var changingGrammarMessageSuppressed = true;
var oldCode = "";
var freeForAllRefactorToggle = false;
var scriptItActivated = false;
//TODO as an intro mechanism we can use the activation commands of the
//TODO package.json to generate a small tutorial for the tool

function highlightCursorNewPos(){
  rangeList = ""
  if(highlightedMarkersList.length != 0 && !reverseHighlightInProgress){
    for (jj = 0; jj<highlightedMarkersList.length; jj++){
      highlightedMarkersList[jj].destroy();
    }
    highlightedMarkersList = [];
  }
  if(highlightToggle){
    var tempCursor = null;
    let cursors = currentEditor.getCursors();
    var bufferLineRange = null;
    var index = 0;
    tempCursor = cursors[index];
    while (tempCursor != null){
      bufferLineRange = tempCursor.getCurrentLineBufferRange();
      rangeList = rangeList + "," + String(tempCursor.getBufferRow()+1); //julia side starts at 1
      index += 1;
      tempCursor = cursors[index];
      highlightedMarker = currentEditor.markBufferRange(bufferLineRange);
      highlightedMarkersList.push(highlightedMarker);
      if(!reverseHighlightInProgress){//In order not to have 2 higlights while reverse highlighting
        let decoration = currentEditor.decorateMarker(highlightedMarker, {type: 'highlight', class: 'script-it'});
      }
    }
    var currentTabPath = currentEditor.getPath();
    actualJuliaClientIPC.rpc('highlightShape', [currentTabPath,rangeList]);
  }
};


function addNewCursor(){
  let currentCursor = currentEditor.getLastCursor();
  currentCursor.onDidChangePosition(highlightCursorNewPos);
  highlightCursorNewPos()
};


function highlightCursorWithIntensity(r,intensity,colour){
  tempCursor2 = currentEditor.addCursorAtBufferPosition(r);
  bufferLineRange2 = tempCursor2.getCurrentLineBufferRange();
  highlightedMarker2 = currentEditor.markBufferRange(bufferLineRange2);
  highlightedMarkersList.push(highlightedMarker2);
  console.log("Highlighting range: " + r + " with intensity: " + intensity + " and colour: " + colour);
  decoration = currentEditor.decorateMarker(highlightedMarker2, {type: 'text', style:{"background-color":colour+ intensity + ")"}});
}

function highlightCodeRange(rangeList){//rangeList => [[control flow lines], ..., [control flow lines]]
    all_Cursors = currentEditor.getCursors();
    for (jj2 = 0; jj2<all_Cursors.length; jj2++){
      all_Cursors[jj2].destroy();
    }
    if(highlightedMarkersList.length != 0){
      for (ii1 = 0; ii1<highlightedMarkersList.length; ii1++){
        highlightedMarkersList[ii1].destroy();
      }
      highlightedMarkersList = [];
    }

    //---------------First Control Flow to be highlighted-----------------//
    currentRanges = rangeList[0];
    r = [currentRanges[0]-1, 0]; //Index in julia start at 1 and in js at 0
    currentEditor.setCursorBufferPosition(r);//First cursor must not be added but moved
    reverseHighlightInProgress = true;//to block the highlight marker list from being cleaned
    for (ii2=1; ii2<currentRanges.length; ii2++){
      r = [currentRanges[ii2]-1,0];//Index in julia start at 1 and in js at 0
      intensity = String((currentRanges.length-ii2)/(currentRanges.length));
      highlightCursorWithIntensity(r,intensity,"rgba(255,242,172,");//This is the first intensity decrease so it needs to be yellow
    }
    //---------------First Control Flow to be highlighted-----------------//


    for (listGroupIter=1; listGroupIter<rangeList.length; listGroupIter++){
      currentRanges = rangeList[listGroupIter];
      r = [currentRanges[0]-1, 0]; //Index in julia start at 1 and in js at 0
      highlightCursorWithIntensity(r,String(1.0),"rgba(255,242,172,");//MAYBE CHANGE TO OTHER COLOURS TO DIFFER FROM OTHE CONTROL FLOWS
      for (lowIntenseIter=1; lowIntenseIter<currentRanges.length; lowIntenseIter++){
        r = [currentRanges[lowIntenseIter]-1,0];//Index in julia start at 1 and in js at 0
        intensity = String((currentRanges.length-lowIntenseIter)/(currentRanges.length));
        highlightCursorWithIntensity(r,intensity,"rgba(255,242,172,");//MAYBE CHANGE TO OTHER COLOURS TO DIFFER FROM OTHE CONTROL FLOWS
      }
    }
    reverseHighlightInProgress = false;//to block the highlight marker list from being cleaned
};


function reverseHighlightAuxiliary(reverseHighlightFilesAndLines){
  for(rr = 0; rr<reverseHighlightFilesAndLines.length; rr++){
    fileAndLines=reverseHighlightFilesAndLines[rr];
    file = fileAndLines[0];
    lines = fileAndLines[1];
    if(file!=null && lines.length!=0){
      console.log("File: " + file + " and lines: " + lines);
      atom.workspace.open(file).then((result) => highlightCodeRange(lines));
      break;
    }
  }
};

function changeActiveTextEditor(){
  addCursorDispose.dispose()
  changePositionDispose.dispose()
  currentEditor = atom.workspace.getActiveTextEditor();
  if(currentEditor !=null){
    currentCursor = currentEditor.getLastCursor();
    changePositionDispose = currentCursor.onDidChangePosition(highlightCursorNewPos);
    addCursorDispose = currentEditor.onDidAddCursor(addNewCursor);
    highlightCursorNewPos();
    if(!changingTextEditorMessageSuppressed){
      atom.confirm({
        message: 'WARNING: you are changing between text editor tabs.\nThis will make the highlightings wrong! Highlighting features deactivated.',
        detail: 'Do you want to suppress this message in the future?',
        buttons: ['Yes', 'No']
      }, response => {
        if (response === 0) {
          window.alert("Future changed editor messages suppressed. Highlighting features will still be deactivated by default.");
          changingTextEditorMessageSuppressed = true;
        }
        else if (response === 1) {
          //Nothing to do here
        }
      })
    }
    textEditorGrammar = currentEditor.getGrammar();
    if(changingGrammarMessageSuppressed == false && textEditorGrammar!=null && textEditorGrammar!=atom.grammars.grammarForScopeName("source.julia")){
      atom.confirm({
        message: 'This tab grammar is not set for julia language, do you want to change it to allow the julia syntax highlighting?',
        buttons: ['Yes', 'No', 'Never']
      }, response => {
        if (response === 0) {
          window.alert("Grammar syntax changed to Julia.");
          currentEditor.setGrammar(atom.grammars.grammarForScopeName("source.julia"));
        }
        else if (response === 1) {
          window.alert("Not changing grammar syntax to julia.");
          //Nothing to do here
        }
        else if (response === 2) {
          window.alert("Never bothering you again.");
          changingGrammarMessageSuppressed=true;
        }
      })
    }
  }
};

function checkBiggerLineNumRange(rangeList){
  biggerId=0;
  biggerLineNum=0;
  biggerRange = null;
  for(bb1=0; bb1<rangeList.length; bb1++){
    lineNum = rangeList[bb1].start.row;
    if(lineNum>biggerLineNum){
      biggerRange = rangeList[bb1];
      biggerId=bb1;
    }
  }
  rangeList.splice(biggerId,1);
  return [biggerRange, rangeList];
};

export default{

  scriptItView: null,
  modalPanel: null,
  subscriptions: null,

  //--------------------------------------------------------------//
  //--------------------Consumed Julia Client---------------------//
  //--------------------------------------------------------------//

  consumeJuliaClient(juliaClient){
    actualJuliaClient = juliaClient;
    actualJuliaClientIPC = juliaClient.ipc;
    console.log("run");
    console.log("IPC: " + actualJuliaClient.isWorking());
    console.log("Conn: " + actualJuliaClient.isActive());
    //console.log("test: " + juliaClient.stdin('println(\"test2\")'));
  },

  //--------------------------------------------------------------//
  //--------------------Consumed Julia Client---------------------//
  //--------------------------------------------------------------//


  activate(state) {
    this.scriptItView = new ScriptItView(state.scriptItViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.scriptItView.getElement(),
      visible: false
    });


    currentEditor = atom.workspace.getActiveTextEditor();
    currentCursor = currentEditor.getLastCursor();
    changePositionDispose = currentCursor.onDidChangePosition(highlightCursorNewPos);
    addCursorDispose = currentEditor.onDidAddCursor(addNewCursor);
    changeEditorDispose = atom.workspace.onDidChangeActiveTextEditor(changeActiveTextEditor);


    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'script-it:StartScriptIt': () => this.startScriptIt()
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'script-it:Traceability': () => this.traceability()
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'script-it:TraceToggle': () => this.traceToggle()
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'script-it:FreeForAllRefactor': () => this.freeForAllRefactor()
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'script-it:Make-Function': () => this.extractFunction()
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'script-it:ExtractCode': () => this.extractCode()
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'script-it:ReverseHighlighting': () => this.reverseHighlighting()
    }));

    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'script-it:Help': () => this.help()
    }));
    this.subscriptions.add(atom.commands.add('atom-workspace', {
      'script-it:ExitHelp': () => this.exitHelpBackdoor()
    }));

  },

  deactivate() {
    changingTextEditorMessageSuppressed = true;
    changingGrammarMessageSuppressed=true;
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.scriptItView.destroy();
  },

  serialize() {
    return {
      scriptItViewState: this.scriptItView.serialize()
    };
  },

  startScriptIt(){
    if(!scriptItActivated){
    //   window.alert("Welcome to ScriptIt!\nIf you need help press ctrl+alt+h.");
      actualJuliaClientIPC.rpc('script_it_start');
      scriptItActivated = true;
    }
  },

  //TODO maybe change this action to Help or intro mode
  traceability() {
    newCode = currentEditor.getText();
    if(oldCode==""){
      oldCode=newCode;
    }
    else if(!highlightToggle  && newCode!=oldCode && freeForAllRefactorToggle){
      actualJuliaClientIPC.rpc('changeDetected');
      atom.commands.dispatch(atom.views.getView(currentEditor), 'julia-client:run-all');
      oldCode=newCode;
      console.log("Rerun needed");
    }
    console.log("Traceability mode activate");
    highlightToggle=!highlightToggle;
    actualJuliaClientIPC.rpc('toggleTraceability', highlightToggle);
    console.log("Toogle: " + highlightToggle);
    console.log("Conn: " + actualJuliaClient.isActive());
    console.log("IPC: " + actualJuliaClient.isWorking());
  },

  traceToggle() { //Toggle the type of control flow, either last call or complete control flow
    actualJuliaClientIPC.rpc('toggleControlFlow');
  },

  freeForAllRefactor() {
    freeForAllRefactorToggle=!freeForAllRefactorToggle;
    console.log("freeForAllRefactorToggle: ", freeForAllRefactorToggle);
    actualJuliaClientIPC.rpc('toggleFreeForAllRefactoring', freeForAllRefactorToggle);
  },

  help() {
    console.log('ScriptIt Help!');
    if (!(this.modalPanel.isVisible())){
      return this.modalPanel.show();
    }
    return this.modalPanel.hide();
  },

  exitHelpBackdoor(){
    if (this.modalPanel.isVisible()){
      return this.modalPanel.hide();
    }
  },




  extractCode(){
    window.alert("Starting algorithm extraction...");
    var currentTabPath = currentEditor.getPath();
    if(!currentEditor.isEmpty()){
      atom.confirm({
        message: 'Text editor is not empty. If you want to continuing the algorithm extraction ScriptIt we will clean the text editor.',
        detail: 'Do you want to continue?',
        buttons: ['Yes', 'No']
      }, response => {
        if (response === 0) {
          //window.alert("Cleaning text editor and starting the algorithm extraction");
          currentEditor.selectAll();
          currentEditor.delete();
          actualJuliaClientIPC.rpc('extractCode', currentTabPath).then((result) => this.activateHighlighting(result, "extr"));
        }
        else if (response === 1) {
          window.alert("Algorithm extraction cancelled. Keeping the text editor untouched.");
          return;
        }
      })
    }
    else{
      actualJuliaClientIPC.rpc('extractCode', currentTabPath).then((result) => this.activateHighlighting(result, "extr"));
    }
  },

  activateHighlighting(text, extrOrRun){
    if(extrOrRun == "extr" && text != ""){
      currentEditor.insertText(text);
      atom.commands.dispatch(atom.views.getView(currentEditor), 'julia-client:run-all');
    }
    currentEditor.selectAll();
    atom.commands.dispatch(atom.views.getView(currentEditor), 'editor:auto-indent');
  },

  reverseHighlighting(){
    if(!currentEditor.isEmpty()){
      if(!highlightToggle){
        highlightToggle = !highlightToggle;
      }
      actualJuliaClientIPC.rpc('reverseHighlight').then((result) => reverseHighlightAuxiliary(result));
    }
    else{
      window.alert("Nothing to reverse highlight.");
      return;
    }
  },

  extractFunction(){
    var manualToggle = false
    if (highlightToggle){
      highlightToggle=!highlightToggle;
      manualToggle = true;
      highlightCursorNewPos();
    }
    var begin = "function func" + funcCounter + "()";
    var end = "end";
    var call = "func" + funcCounter + "()";
    var functionText = [];
    var cursorRanges = [];
    var linesBeforeChange = []; //list of numbers
    var linesChanges = []; // list of lists with pairs of before and after line nums
    var newRangeStartBeforeIndentation = [];
    var infoToSend = "";
    var functionCallRange = "";
    var all_Cursors = currentEditor.getCursors();

    for(ii=0; ii<all_Cursors.length; ii++){
      functionText.push(all_Cursors[ii].getCurrentBufferLine());
      cursorRanges.push(all_Cursors[ii].getCurrentLineBufferRange());
      linesBeforeChange.push(all_Cursors[ii].getCurrentLineBufferRange().start.row + 1) //due to julia indexing
    }

    //-------------------------------------------------//
    //-----------------EXPLAIN BETTER-----------------//
    //------------------------------------------------//
    specialFilter = checkBiggerLineNumRange(cursorRanges);
    callRange=specialFilter[0];
    cursorRanges = specialFilter[1];
    currentEditor.setTextInBufferRange(callRange, call);
    linesChanges.push([callRange.start.row + 4]); //This is the call line which will be associated with all the other function lines WE HAVE TO ADD 2 BECAUSE TWO MORE LINES OF THE FUNCTION CREATION ARE ADDED. HOWEVER SINCE JULIA STARTS AT INDEX 1 WE ADD ANOTHER 2. Due to function extraction ADDING 4

    currentEditor.setCursorBufferPosition(cursorRanges[0].start);//Placing the first cursor on the first line of the function lines
    for(ii = 1; ii<cursorRanges.length; ii++){
      currentEditor.addCursorAtBufferPosition(cursorRanges[ii].start);
    }
    currentEditor.deleteLine();//delete the function lines that were extracted

    //-------------------------------------------------//
    //-----------------EXPLAIN BETTER-----------------//
    //------------------------------------------------//

    currentEditor.moveToTop();
    currentEditor.moveDown()
    currentEditor.insertNewlineBelow();
    currentEditor.insertText(begin);
    for(ii=0; ii<functionText.length; ii++){
      currentEditor.insertNewlineBelow();
      tempCursor = currentEditor.getLastCursor();
      tempCurrentLine = tempCursor.getCurrentLineBufferRange().start.row + 1; //Due to julia indexing starting at 1
      linesChanges.push([tempCurrentLine, linesBeforeChange[ii]]);
      currentEditor.insertText(functionText[ii]);
    }
    currentEditor.insertNewlineBelow();
    currentEditor.insertText(end);


    currentEditor.selectAll();
    atom.commands.dispatch(atom.views.getView(currentEditor), 'editor:auto-indent');


    var currentTabPath = currentEditor.getPath();
    var text = currentEditor.getSelectedText()

    atom.commands.dispatch(atom.views.getView(currentEditor), 'julia-client:run-all');

    funcCounter++;
    if(manualToggle){
      highlightToggle=!highlightToggle;
      manualToggle = false;
    }
  }

};
