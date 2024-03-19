const TOTAL = 100;

function line_intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  var ua,
    ub,
    denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom == 0) {
    return null;
  }
  ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  return {
    x: x1 + ua * (x2 - x1),
    y: y1 + ua * (y2 - y1),
    seg1: ua >= 0 && ua <= 1,
    seg2: ub >= 0 && ub <= 1,
  };
}

//assuming decimal odds here
function getWagersAndROI(odds1, odds2, total) {
  // Equations are x+y = total & odds1*x - odds2*y = 0

  // Need to generate two points on each of these lines (so that lines are long enough to find intersection)
  // Can use x and y-intercepts of x+y=total (both of which are == total)
  // Use 0,0 for second equation
  // Second point - set x to total and find out what y must be
  const last_point_x = total;
  const last_point_y = (odds1 * total) / odds2;
  const wagers = line_intersect(
    0,
    total,
    total,
    0,
    0,
    0,
    last_point_x,
    last_point_y,
  );
  const ROI = (100 * (wagers.x * odds1 - total)) / total;
  return [wagers.x, wagers.y, ROI];
}

function getOdds() {
  // Returned as JSON string
  return localStorage.getItem("odds");
}

function scrape_betrivers() {
  function abridge_cat_name_player_props(S) {
    var ret = S.replace("by the player", "");
    if (ret.includes("scored")) {
      ret = ret.replace("scored", "");
    } else if (ret.includes("3-point field goals")) {
      ret = ret.replace("3-point field goals", "three-pointers");
    }
    return ret;
  }

  const odds = new Object();
  // just want moneyline, total points, point spread, and player props for now
  var subcats = document.getElementsByClassName(
    "KambiBC-bet-offer-subcategory__container",
  );
  for (var i = 0; i < subcats.length; i++) {
    subcat_name = subcats[i].getElementsByTagName("h3")[0].textContent;
    if (subcat_name == "Moneyline") {
      // two buttons
      const buttons = subcats[i].getElementsByTagName("button");
      odds["moneyline"] = new Object();
      const divs1 = buttons[0].getElementsByTagName("div");
      odds["moneyline"]["home"] = divs1[3].textContent;
      const divs2 = buttons[1].getElementsByTagName("div");
      odds["moneyline"]["away"] = divs2[3].textContent;
    } else if (subcat_name == "Point Spread") {
      // get all buttons and go through them two at a time
      const buttons = subcats[i].getElementsByTagName("button");
      for (var j = 0; j < Math.floor(buttons.length / 2); j++) {
        const divs1 = buttons[j].getElementsByTagName("div");
        const divs2 =
          buttons[j + Math.floor(buttons.length / 2)].getElementsByTagName(
            "div",
          );
        const line1 = divs1[3].textContent;
        const line2 = divs2[3].textContent;
        odds[`spread ${line1} ${line2}`] = new Object();
        odds[`spread ${line1} ${line2}`]["home"] = divs1[7].textContent;
        odds[`spread ${line1} ${line2}`]["away"] = divs2[7].textContent;
      }
    } else if (subcat_name == "Total Points") {
      const buttons = subcats[i].getElementsByTagName("button");
      for (var j = 0; j < Math.floor(buttons.length / 2); j++) {
        const divs1 = buttons[j].getElementsByTagName("div");
        const divs2 =
          buttons[j + Math.floor(buttons.length / 2)].getElementsByTagName(
            "div",
          );
        const line = divs1[3].textContent;
        odds[`total ${line}`] = new Object();
        odds[`total ${line}`][divs1[2].textContent.toLowerCase()] =
          divs1[7].textContent;
        odds[`total ${line}`][divs2[2].textContent.toLowerCase()] =
          divs2[7].textContent;
      }
    } else if (subcat_name.includes("by the player")) {
      columns = subcats[i].getElementsByClassName(
        "KambiBC-outcomes-list__column",
      );
      column1_elements = columns[0].children;
      column2_elements = columns[1].children;
      // get header names from first h4's in each column1_elements
      const header1 = column1_elements[0].textContent;
      const header2 = column2_elements[0].textContent;
      var key_base = "";
      for (var k = 1; k < column1_elements.length; k++) {
        if (column1_elements[k].constructor.name === "HTMLHeadingElement") {
          key_base =
            abridge_cat_name_player_props(subcat_name) +
            " " +
            column1_elements[k].textContent;
        }
        if (column1_elements[k].constructor.name == "HTMLButtonElement") {
          var divs1 = column1_elements[k].getElementsByTagName("div");
          var divs2 = column2_elements[k].getElementsByTagName("div");
          const key_str = key_base + " " + divs1[3].textContent;
          odds[key_str.toLowerCase()] = new Object();
          odds[key_str.toLowerCase()][header1.toLowerCase()] =
            divs1[4].textContent;
          odds[key_str.toLowerCase()][header2.toLowerCase()] =
            divs2[4].textContent;
        }
      }
    }
  }
  return odds;
}

async function betrivers(tab_id) {
  // Scrape the betrivers page
  const result = await chrome.scripting.executeScript({
    target: { tabId: tab_id },
    func: scrape_betrivers,
  });
  return result[0].result;
}

async function draftkings(tab_id) {
  // DEBUG
  return {
    Moneyline: { "GS Warriors": ["+300", ""], "IND Pacers": ["+105", ""] },
    "Point Spread +5.5 -5.5": {
      "GS Warriors": ["-115", ""],
      "IND Pacers": ["+300", ""],
    },
  };
}

function scrape_betmgm() {
  //get moneyline, spread, totals, and player props
  var odds = {};
  const panels = document.body.getElementsByClassName("option-panel");
  for (var i = 0; i < panels.length; i++) {
    // get title of panel
    const title = panels[i].getElementsByClassName(
      "option-group-header-title",
    )[0].textContent;
    if (title == "Game Lines") {
      // find moneyline
      odds["moneyline"] = new Object();
      const options = panels[i].getElementsByClassName("option-indicator");
      const teams = panels[i].getElementsByClassName("six-pack-player-name");
      odds["moneyline"]["home"] = options[2].textContent;
      odds["moneyline"]["away"] = options[5].textContent;
    } else if (title == "Totals") {
      const options = panels[i].getElementsByClassName("option-value");
      const keys = panels[i].getElementsByClassName("attribute-key");
      for (var j = 0; j < keys.length; j++) {
        odds["total" + " " + keys[j].textContent.trim()] = {
          over: options[2 * j].textContent,
          under: options[2 * j + 1].textContent,
        };
      }
    } else if (title == "Spread") {
      const headers = panels[i]
        .getElementsByClassName("option-group-header")[0]
        .getElementsByTagName("span");
      const options = panels[i].getElementsByClassName("option-indicator");
      for (var j = 0; j < options.length; j += 2) {
        const divs1 = options[j].getElementsByTagName("div");
        const divs2 = options[j + 1].getElementsByTagName("div");
        odds[
          "spread " + divs1[0].textContent + " " + divs2[0].textContent.trim()
        ] = new Object();
        odds[
          "spread " + divs1[0].textContent + " " + divs2[0].textContent.trim()
        ]["home"] = divs1[1].textContent;
        odds[
          "spread " + divs1[0].textContent + " " + divs2[0].textContent.trim()
        ]["away"] = divs2[1].textContent;
      }
    } else if (title.includes("Player")) {
      const prop = title.replace("Player ", "");
      const options = panels[i].getElementsByClassName("option-indicator");
      const keys = panels[i].getElementsByClassName("attribute-key");
      for (var j = 0; j < keys.length; j++) {
        const divs1 = options[2 * j].getElementsByTagName("div");
        const divs2 = options[2 * j + 1].getElementsByTagName("div");
        const player_name = keys[j].textContent.toLowerCase();

        odds[
          (
            prop +
            " " +
            player_name.split(" ")[1] +
            ", " +
            player_name.split(" ")[0] +
            " " +
            divs1[0].textContent
          ).trim()
        ] = {
          over: divs1[1].textContent,
          under: divs2[1].textContent,
        };
      }
    }
  }
  return odds;
}

async function betmgm(tab_id) {
  // Scrape the betrivers page
  const result = await chrome.scripting.executeScript({
    target: { tabId: tab_id },
    func: scrape_betmgm,
  });
  return result[0].result;
}

function AtoD(a) {
  if (a >= 0) {
    return 1 + a / 100;
  } else {
    return 1 + 100 / -a;
  }
}

function hasArbitrageAmerican(odds1, odds2) {
  if (odds1 < 0 && odds2 > 0) {
    return odds2 > -odds1;
  } else if (odds1 > 0 && odds2 > 0) {
    return true;
  } else if (odds1 > 0 && odds2 < 0) {
    return odds1 > -odds2;
  }
  return false;
}

function getOddsFromButton(tab_id, button_id) {
  // post to channel (DEBUG console.log for now)
  // get all divs
  if (platform === "betrivers") {
    var divs = button.getElementsByTagName("div");
    if (divs.length == 7) {
      return divs[3].textContent;
    } else if (divs.length == 8) {
      return divs[4].textContent;
    }
    odd;
    return 0;
  } else {
    // TODO: make for draftkings and betmgm (for now just return button)
    return button;
  }
}

function oddsComp(tab_id1, oddSet1, tab_id2, oddSet2) {
  // TODO: Assume same keys between o1 and o2 for now; need to reformat each so that they're the same
  o1_keys = Object.keys(oddSet1);
  for (var i = 0; i < o1_keys.length; i++) {
    if (o1_keys[i] in oddSet2) {
      // Check for two-way arbs (TODO: Consider checking for 3-way, 4-way, etc.)
      if (Object.keys(oddSet1[o1_keys[i]]).length === 2) {
        // oddSet2 should also be length two if oddSet1 has only two outcomes
        const odds1_key = Object.keys(oddSet1[o1_keys[i]])[0];
        const odds2_key = Object.keys(oddSet1[o1_keys[i]])[1];
        // TODO: Refactor so that we are getting odds from button here
        const oddSet11 = oddSet1[o1_keys[i]][odds1_key][0];
        const oddSet12 = oddSet1[o1_keys[i]][odds2_key][0];
        const oddSet21 = oddSet2[o1_keys[i]][odds1_key][0];
        const oddSet22 = oddSet2[o1_keys[i]][odds2_key][0];
        // Compare odds1 to odds2
        if (hasArbitrageAmerican(oddSet11, oddSet22)) {
          // Compute Wager & ROI and take with bot if good enough
          const wAROI = getWagersAndROI(AtoD(oddSet11), AtoD(oddSet22), TOTAL);
          const x = wAROI[0].toFixed(2);
          const y = wAROI[1].toFixed(2);
          const ROI = wAROI[2].toFixed(2);
          document.getElementById(
            "all-arbs",
          ).innerHTML += `<p>${o1_keys[i]} ${odds1_key}(${oddSet11}) ${odds2_key}(${oddSet22}): [${x}, ${y}] for ${ROI}\% ROI</p>`;
        }
        if (hasArbitrageAmerican(oddSet12, oddSet21)) {
          // Compute Wager & ROI and take with bot if good enough
          const wAROI = getWagersAndROI(AtoD(oddSet12), AtoD(oddSet21), TOTAL);
          const x = wAROI[0].toFixed(2);
          const y = wAROI[1].toFixed(2);
          const ROI = wAROI[2].toFixed(2);
          document.getElementById(
            "all-arbs",
          ).innerHTML += `<p>${o1_keys[i]} ${odds1_key}(${oddSet12}) ${odds2_key}(${oddSet21}): [${x}, ${y}] for ${ROI}\% ROI</p>`;
        }
      }
    }
  }
}

/* TODOs
  1. Scrape title of games so that odds are matched with the appropriate game (not super necessary; can put on backburner)
  2. Cook up sample data to work with on Betrivers while doing they make the other scrapers
  3. Build the bots that places bets as well
  4. Figure out how to check which subcategory is already open on betrivers
  5. List arbs we take on the actual extension
  6. Scheme for letting user know which arbs have been taken and which haven't (make sure we test with the minimum bet amount first)
    -- Yellow for in "computation in process"
    -- Green for both wagers were placed
    -- Red for both wagers not placed (for some reason -- perhaps b/c account is blocked, there's a wager limit, or odds have changed)
  7. Allow user to set the amunt they want to wager on each arb (could dynamically have them enter the amount next to the opportunity)
  8. May need to wait for bets to place on one platform before moving on (since UI can't show more than one bet placement at a time)
  9. Scrape such that only the outcomes on one row are available (current odds ignore players)
  11. Going to need a separate selnium bot that is fed data from the chrome extension and places bets
  12. Scrape data on section by section basis to make it as clean as possible and so tht we don't waste time "converting to common" here
*/
window.onload = function () {
  // Get pairs of events that are live from different platforms
  // assume only one tab from each bookie for one event for now (can be fixed later)
  var event_tabs = {};
  chrome.tabs.query({}, function (tabs) {
    for (var i = 0; i < tabs.length; i++) {
      // iterate through event_page_substr keys and scrape pages appropriately
      if (
        tabs[i].url.includes("https://ny.betrivers.com/?page=sportsbook#event")
      ) {
        event_tabs["betrivers"] = tabs[i].id;
      } else if (
        tabs[i].url.includes("https://sportsbook.draftkings.com/event")
      ) {
        event_tabs["draftkings"] = tabs[i].id;
      } else if (
        tabs[i].url.includes("https://sports.ny.betmgm.com/en/sports/events")
      ) {
        event_tabs["betmgm"] = tabs[i].id;
      }
    }
    function appropriate_scrape(bookie, tab_id) {
      if (bookie == "betrivers") {
        return betrivers(tab_id);
      }
      if (bookie == "draftkings") {
        return draftkings(tab_id);
      }
      if (bookie == "betmgm") {
        return betmgm(tab_id);
      }
    }

    // Pair wise get, compare odds, and do bot stuff
    event_tabs_keys = Object.keys(event_tabs);
    for (var i = 0; i < event_tabs_keys.length; i++) {
      for (var j = i + 1; j < event_tabs_keys.length; j++) {
        key1 = event_tabs_keys[i];
        key2 = event_tabs_keys[j];
        appropriate_scrape(key1, event_tabs[key1]).then((result1) => {
          appropriate_scrape(key2, event_tabs[key2]).then((result2) => {
            // Compare odds
            console.log(result1);
            console.log(result2);
            oddsComp(event_tabs[key1], result1, event_tabs[key2], result2);
          });
        });
      }
    }
  });
};
