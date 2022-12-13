/*=============================================================================
GANG V5 – Requires 3 GB RAM by Troff//Note: This is a NON-HACK (i.e. combat gang) gang script.
Version 5 – added automated config file handling (no more manual stuff!)
Made minor improvements, these include better war management and also
excluding buying of non-combat equipment to save some money.
You can turn ON lines marked "DEBUG" to get a further understanding or
for troubleshooting. Feel free to delete them (as they're not required)
@param {NS} ns */

export async function main(ns) {
	/* ===============================================
	   SETTINGS START (change as required)*/
	var lenCom = 21; //Text length of gang member's task displayed
	let buyStuff = 1; //Can gang members buy equipment? 1=Yes, 0=No
	let minCash = 150333111222; //Min cash (150B to start a corp)
	let maxrank = 8; // Max level to rank for each gang member
	let equiprank = 2; // Rank at which members can buy equipment (default: 2)
	let defaulttask = "Traffick Illegal Arms"; //Default task if no criteria met
	let sleepdelay = 16000; // Pause in milliseconds between each loop

	// War team (e.g. the first 6) stop automatically once we hit 100% territory
	let warguys = 6; // Number of gang members to engage in territory warfare
	let warchance = 0.97; // Minimum win chance before we start war with gangs

	// ### Ascension level settings (adjust as required) ###
	// Read up on gang level progression. You should do a clean run & note
	// your own rules/levels etc- we use rank numbers to track ascension level,
	// e.g. 4=934 stats, 5=56k. Insert more if needed, but need adjust some code
	let ascend = true; // do we check ascensions?
	let rnk1 = 98; // Rank 1 (gives a x2 multiplier)
	let rnk2 = 274; // Rank 2 (gives a x4 multiplier, +0.25 rate)
	let rnk3 = 550; // Rank 3 (gives x6 multiplier)
	let rnk4 = 934; // Rank 4 (x8 multiplier)
	let rnk5 = 56000; // Rank 5 (x19 multiplier with mods)
	let rnk6 = 145111; // Rank 6 (x36 multiplier with mods)
	let rnk7 = 380111; // Rank 7 (x80-82 multiplier with mods)
	let rnk8 = 1256111; // Rank 8 (roughly $1 billion/second income)

	//TO DO in v6 – automate rank 8 onwards to accomodate higher levels
	// Criteria for when to start Vigilante work to lower Wanted level
	let minVResp = 1; // Minimum respect to do vigilante work
	let minVPen = 10; // If Penalty above this then do vigi work
	let minVWant = 5; // If Wanted level above this then do vigi
	let minVRank = rnk2; // Minimum member ascension rank to vigi
	// SETTINGS END

	// Set DEFAULT VARIABLES (don't change anything)
	let loops = 0; // keeps track of loops
	let ascensionCounter = 0; // helps keeps track when to check ascensions
	// Set default ascension ranks of members. Members are named 0, 1, 2, etc
	let ascmem = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	let lengthdump = 0; // Default gang size read from cfg file
	let warfare = false; // Set territory warfare to false
	// Set default gang territory (need more variables as turnover is longer)
	var gangt0 = 0; var gangt1 = 0; var gangt2 = 0; let gangtx = 0;
	let ganginwar = 0; // Set counter for number members in territory warfare

	// Disable Logs
	ns.disableLog("disableLog"); ns.disableLog("sleep"); ns.disableLog("exec");
	ns.disableLog("getServerMoneyAvailable"); ns.disableLog("gang.ascendMember");
	ns.disableLog("gang.setMemberTask"); ns.disableLog("gang.purchaseEquipment");
	ns.disableLog("gang.recruitMember"); ns.disableLog("gang.setTerritoryWarfare");

	// Open log window and show start of script in logs
	ns.tail();
	ns.print("🔥 GANG SCRIPT START 🔥");
	// Attempt to read current gang member ranks from text config file
	//ns.print("Starting to read gang txt file… "); // DEBUG

	if (ns.fileExists("/Temp/gang - cfg.txt", "home")) {
		ns.print("INFO ## Gang txt file EXISTS ##")
		let listnames = [];
		var datadump = JSON.parse(ns.read("/Temp/gang - cfg.txt"));
		if (datadump.length > 0) {
			lengthdump = datadump.length; // Transfer value for checking later
			for (var ij = 0; ij < datadump.length; ij++) {
				listnames[ij] = datadump[ij].name;
				ascmem[ij] = datadump[ij].ascmem;
				ns.print("N: ", listnames[ij], " Asc: ", ascmem[ij])
			}
		}
	}

	// If number of gang members is too low, we need to reset the config file
	// (this assumes in subsequent launches you'll have more than 3 guys)
	// Once you're up and running with more than 3 guys this is ignored on
	// subsequent stops and restarting of this script.
	if (lengthdump < 4) {
		const resetconfig = await resetGangFile(ns);
		ns.sleep(100); // To be safe, delay a bit when writing file
		ns.print("Resetting gang file: ", resetconfig);

		// Meanwhile here in program, load the reset variables into memory
		ascmem = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
	}

	// ###################################
	// MAIN WHILE LOOP START
	while (true) {
		// Resize the log window to the width of the red dots for perfect fit
		ns.print(" "); // Blank line to seperate loops
		ns.print("🔴🔴🔴🔴🔴🔴🔴 G A N G 🔴🔴🔴🔴🔴🔴🔴");

		// Get Gang info, cash and equipment names
		let myGang = await runCom1(ns, 'ns.gang.getGangInformation() ', 'getGangInfo');
		let curCash = await runCom1(ns, 'ns.getServerMoneyAvailable(ns.args[0]) ', 'getSerMon', ["home"]);
		let allEquipment = await runCom1(ns, 'ns.gang.getEquipmentNames() ', 'getEqName');
		var curResp = ns.nFormat(myGang.respect, "0, 0.a");
		var curResp2 = myGang.respect;

		//ns.print("Respect: " + curResp2); // DEBUG
		// Recruit members if possible
		var canrecruit = await runCom1(ns, 'ns.gang.canRecruitMember() ', 'canRecr');

		//ns.print("INFO Can recruit: " + canrecruit); // DEBUG
		while (canrecruit == true) {
			for (let ij = 0; ij < 30; ++ij) {
				var canrecruit = await runCom1(ns, 'ns.gang.canRecruitMember() ', 'canRecr');

				//ns.print("INFO Can recruit: " + canrecruit); // DEBUG
				if (canrecruit == true) {
					ns.print("🔴RECRUITED: " + ij + "🔴");
				}
			}
		}

		// Get gang member names
		let members = await runCom1(ns, 'ns.gang.getMemberNames() ', 'getMemNam');

		// Get Territory % and get 'wanted over respect' level
		var ganginfo = await runCom1(ns, 'ns.gang.getGangInformation() ', 'getGangInfo');
		gangtx = ganginfo.territory;
		var curResp = ganginfo.respect;
		var curWant = ganginfo.wantedLevel;
		var curPena2b = ganginfo.wantedLevel / ganginfo.respect * 100;

		//ns.print("🔴Want/Respect: " + ns.nFormat(curPena2b, "0,0.00") +" %" );
		// //Reset check for gang members in territory warfare & reset warfare status
		ganginwar = 0;
		warfare = false;
		
		// Function: Sleep
		function sleep(ms) {
			return new Promise(resolve => setTimeout(resolve, ms));
		}// Function: Check chances of war against other gangs

		export async function checkgangwar(ns, winchance) {
			var gangresult = true; // By default we CAN engage in warfare
			// Gang names for reference:
			// Tetrads, The Syndicate, Speakers for the Dead
			// The Black Hand, The Dark Army, NiteSec
			//const othergang = ns.gang.getOtherGangInformation(); // DEBUG
			//ns.print("Name : "+JSON.stringify(othergang['Tetrads']) ); //DEBUG
			//ns.print("Power: "+JSON.stringify(othergang['Tetrads'].power) ); //DEBUG
			//ns.print("Terro: "+JSON.stringify(othergang['Tetrads'].territory));//DEB
			//ns.print("Clash: "+ns.gang.getChanceToWinClash('Tetrads') ); //DEBUG
			// Get chances to win wars for all other gangs:
			var chantetr = await runCom1(ns, 'ns.gang.getChanceToWinClash(ns.args[0]) ', 'getChanWin', ["Tetrads"]);
			var chansynd = await runCom1(ns, 'ns.gang.getChanceToWinClash(ns.args[0]) ', 'getChanWin', ["The Syndicate"]);
			var chanspea = await runCom1(ns, 'ns.gang.getChanceToWinClash(ns.args[0]) ', 'getChanWin', ["Speakers for the Dead"]);
			var chanblac = await runCom1(ns, 'ns.gang.getChanceToWinClash(ns.args[0]) ', 'getChanWin', ["The Black Hand"]);
			var chandark = await runCom1(ns, 'ns.gang.getChanceToWinClash(ns.args[0]) ', 'getChanWin', ["The Dark Army"]);
			var channite = await runCom1(ns, 'ns.gang.getChanceToWinClash(ns.args[0]) ', 'getChanWin', ["NiteSec"]);
			//ns.print("Tetrads %: " + ns.nFormat(chantetr, "0.00%")); //DEBUG
			//ns.print("Syndicate %: " + ns.nFormat(chansynd, "0.00%")); //DEBUG
			//ns.print("Speakers %: " + ns.nFormat(chanspea, "0.00%")); //DEBUG
			//ns.print("Black Hand%: " + ns.nFormat(chanblac, "0.00%")); //DEBUG
			//ns.print("Dark Army %: " + ns.nFormat(chandark, "0.00%")); //DEBUG
			//ns.print("NiteSec %: " + ns.nFormat(channite, "0.00%")); //DEBUG
			// Check chances are good for warfare, if not then don't engage
			if (chantetr < winchance) { gangresult = false; }
			if (chansynd < winchance) { gangresult = false; }
			if (chanspea < winchance) { gangresult = false; }
			if (chanblac < winchance) { gangresult = false; }
			if (chandark < winchance) { gangresult = false; }
			if (channite < winchance) { gangresult = false; }
			//ns.print("INFO GangResult : " + gangresult ); //DEBUG
			if (gangresult == true) { return true; }
			if (gangresult == false) { return false; }
		}

		// Function: Reset Gang File
		// Contents of new default gang-cfg.txt file are as follows:
		// [{"name":"0″,"ascmem":0},{"name":"1″,"ascmem":0},{"name":"2″,"ascmem":0}]
		function resetGangFile(ns) {
			ns.print("WARN Writing new gang config file…");
			const cfgScriptContent = "[{ \"name\": \"0\", \"ascmem\":0
		}, { \"name\": \"1\", \"ascmem\": 0 }, { \"name\": \"2\", \"ascmem\": 0 }]";

		const cfgScript = "/Temp/gang - cfg.txt";
		ns.write(cfgScript, cfgScriptContent, "w");
		return true;
	}

	//=============================================================================
	// External SCRIPT RUNNER START (adapted/shortened fr ALAIN BRYDEN's scripts)
	export async function runCom1(ns, command, fileName, args = []) {
		var precursor = "gang5-"; // Could be gang-, blade-, etc
		var fileName = "/Temp/" + precursor + fileName + ".txt";
		var fileName2 = fileName + ".js";
		//ns.print (" fileName = ", fileName) // DEBUG
		//ns.print (" fileName2 = ", fileName2) // DEBUG
		// COMPLEX SCRIPT
		let script = `export async function main(ns) {` +
			`let r;try{r=JSON.stringify(\n` +
			` ${command}\n` +
			`);}catch(e){r="ERROR: "+(typeof e=='string'?e:e.message||JSON.stringify(e));}\n` +
			`const f="${fileName}"; if(ns.read(f)!==r) await ns.write(f,r,'w') } `;
		var oldContents = ns.read(fileName2);
		while (oldContents != script) {
			await ns.write(fileName2, script, "w");
			// Wait for script to appear readable (can be finicky on write)
			var oldContents = ns.read(fileName2);
		}
		//ns.print ("args = ", args) // DEBUG
		for (var ij = 0; ij < 5; ij++) {
			if (args[ij] == null) args[ij] = "0";
			//ns.print ("args[",ij,"] = ", args[ij]) // DEBUG
		};

		//Run the script!
		await ns.exec(fileName2, "home", 1, args[0], args[1], args[2], args[3]);
		//await ns.sleep(50);
		// We 'try' to catch JSON errors (they vanish after 1-2 loops)

		const fileData = await ns.read(fileName);
		try {
			var fileData2 = JSON.parse(fileData);
		} catch (e) {
			console.log('Unable to parse the string.')
		}
		return fileData2;
	}
