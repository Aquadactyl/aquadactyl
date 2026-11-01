import { render } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import Comp0 from "./Account/API/AfterContent";
import Comp1 from "./Account/API/BeforeContent";
import Comp2 from "./Account/Overview/AfterContent";
import Comp3 from "./Account/Overview/BeforeContent";
import Comp4 from "./Account/SSH/AfterContent";
import Comp5 from "./Account/SSH/BeforeContent";
import Comp6 from "./Authentication/Container/AfterContent";
import Comp7 from "./Authentication/Container/BeforeContent";
import Comp8 from "./Dashboard/Global/AfterSection";
import Comp9 from "./Dashboard/Global/BeforeSection";
import Comp10 from "./Dashboard/Serverlist/AfterContent";
import Comp11 from "./Dashboard/Serverlist/BeforeContent";
import Comp12 from "./Dashboard/Serverlist/ServerRow/AfterEntryDescription";
import Comp13 from "./Dashboard/Serverlist/ServerRow/AfterEntryName";
import Comp14 from "./Dashboard/Serverlist/ServerRow/BeforeEntryDescription";
import Comp15 from "./Dashboard/Serverlist/ServerRow/BeforeEntryName";
import Comp16 from "./Dashboard/Serverlist/ServerRow/ResourceLimits";
import Comp17 from "./Navigation/NavigationBar/AdditionalItems";
import Comp18 from "./Navigation/NavigationBar/AfterNavigation";
import Comp19 from "./Navigation/NavigationBar/BeforeNavigation";
import Comp20 from "./Navigation/SubNavigation/AdditionalAccountItems";
import Comp21 from "./Navigation/SubNavigation/AdditionalServerItems";
import Comp22 from "./Navigation/SubNavigation/AfterSubNavigation";
import Comp23 from "./Navigation/SubNavigation/BeforeSubNavigation";
import Comp24 from "./Server/Backups/AfterContent";
import Comp25 from "./Server/Backups/BeforeContent";
import Comp26 from "./Server/Backups/DropdownItems";
import Comp27 from "./Server/Databases/AfterContent";
import Comp28 from "./Server/Databases/BeforeContent";
import Comp29 from "./Server/Files/Browse/AfterContent";
import Comp30 from "./Server/Files/Browse/BeforeContent";
import Comp31 from "./Server/Files/Browse/DropdownItems";
import Comp32 from "./Server/Files/Browse/FileButtons";
import Comp33 from "./Server/Files/Edit/AfterEdit";
import Comp34 from "./Server/Files/Edit/BeforeEdit";
import Comp35 from "./Server/Network/AfterContent";
import Comp36 from "./Server/Network/BeforeContent";
import Comp37 from "./Server/Schedules/Edit/AfterEdit";
import Comp38 from "./Server/Schedules/Edit/BeforeEdit";
import Comp39 from "./Server/Schedules/List/AfterContent";
import Comp40 from "./Server/Schedules/List/BeforeContent";
import Comp41 from "./Server/Settings/AfterContent";
import Comp42 from "./Server/Settings/BeforeContent";
import Comp43 from "./Server/Startup/AfterContent";
import Comp44 from "./Server/Startup/BeforeContent";
import Comp45 from "./Server/Terminal/AdditionalPowerButtons";
import Comp46 from "./Server/Terminal/AfterContent";
import Comp47 from "./Server/Terminal/AfterInformation";
import Comp48 from "./Server/Terminal/BeforeContent";
import Comp49 from "./Server/Terminal/BeforeInformation";
import Comp50 from "./Server/Terminal/CommandRow";
import Comp51 from "./Server/Users/AfterContent";
import Comp52 from "./Server/Users/BeforeContent";

describe("blueprint/components", () => {
  it("renders Account/API/AfterContent.tsx", () => {
    const { container } = render(<Comp0 />);
    expect(container).toBeDefined();
  });
  it("renders Account/API/BeforeContent.tsx", () => {
    const { container } = render(<Comp1 />);
    expect(container).toBeDefined();
  });
  it("renders Account/Overview/AfterContent.tsx", () => {
    const { container } = render(<Comp2 />);
    expect(container).toBeDefined();
  });
  it("renders Account/Overview/BeforeContent.tsx", () => {
    const { container } = render(<Comp3 />);
    expect(container).toBeDefined();
  });
  it("renders Account/SSH/AfterContent.tsx", () => {
    const { container } = render(<Comp4 />);
    expect(container).toBeDefined();
  });
  it("renders Account/SSH/BeforeContent.tsx", () => {
    const { container } = render(<Comp5 />);
    expect(container).toBeDefined();
  });
  it("renders Authentication/Container/AfterContent.tsx", () => {
    const { container } = render(<Comp6 />);
    expect(container).toBeDefined();
  });
  it("renders Authentication/Container/BeforeContent.tsx", () => {
    const { container } = render(<Comp7 />);
    expect(container).toBeDefined();
  });
  it("renders Dashboard/Global/AfterSection.tsx", () => {
    const { container } = render(<Comp8 />);
    expect(container).toBeDefined();
  });
  it("renders Dashboard/Global/BeforeSection.tsx", () => {
    const { container } = render(<Comp9 />);
    expect(container).toBeDefined();
  });
  it("renders Dashboard/Serverlist/AfterContent.tsx", () => {
    const { container } = render(<Comp10 />);
    expect(container).toBeDefined();
  });
  it("renders Dashboard/Serverlist/BeforeContent.tsx", () => {
    const { container } = render(<Comp11 />);
    expect(container).toBeDefined();
  });
  it("renders Dashboard/Serverlist/ServerRow/AfterEntryDescription.tsx", () => {
    const { container } = render(<Comp12 />);
    expect(container).toBeDefined();
  });
  it("renders Dashboard/Serverlist/ServerRow/AfterEntryName.tsx", () => {
    const { container } = render(<Comp13 />);
    expect(container).toBeDefined();
  });
  it("renders Dashboard/Serverlist/ServerRow/BeforeEntryDescription.tsx", () => {
    const { container } = render(<Comp14 />);
    expect(container).toBeDefined();
  });
  it("renders Dashboard/Serverlist/ServerRow/BeforeEntryName.tsx", () => {
    const { container } = render(<Comp15 />);
    expect(container).toBeDefined();
  });
  it("renders Dashboard/Serverlist/ServerRow/ResourceLimits.tsx", () => {
    const { container } = render(<Comp16 />);
    expect(container).toBeDefined();
  });
  it("renders Navigation/NavigationBar/AdditionalItems.tsx", () => {
    const { container } = render(<Comp17 />);
    expect(container).toBeDefined();
  });
  it("renders Navigation/NavigationBar/AfterNavigation.tsx", () => {
    const { container } = render(<Comp18 />);
    expect(container).toBeDefined();
  });
  it("renders Navigation/NavigationBar/BeforeNavigation.tsx", () => {
    const { container } = render(<Comp19 />);
    expect(container).toBeDefined();
  });
  it("renders Navigation/SubNavigation/AdditionalAccountItems.tsx", () => {
    const { container } = render(<Comp20 />);
    expect(container).toBeDefined();
  });
  it("renders Navigation/SubNavigation/AdditionalServerItems.tsx", () => {
    const { container } = render(<Comp21 />);
    expect(container).toBeDefined();
  });
  it("renders Navigation/SubNavigation/AfterSubNavigation.tsx", () => {
    const { container } = render(<Comp22 />);
    expect(container).toBeDefined();
  });
  it("renders Navigation/SubNavigation/BeforeSubNavigation.tsx", () => {
    const { container } = render(<Comp23 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Backups/AfterContent.tsx", () => {
    const { container } = render(<Comp24 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Backups/BeforeContent.tsx", () => {
    const { container } = render(<Comp25 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Backups/DropdownItems.tsx", () => {
    const { container } = render(<Comp26 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Databases/AfterContent.tsx", () => {
    const { container } = render(<Comp27 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Databases/BeforeContent.tsx", () => {
    const { container } = render(<Comp28 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Files/Browse/AfterContent.tsx", () => {
    const { container } = render(<Comp29 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Files/Browse/BeforeContent.tsx", () => {
    const { container } = render(<Comp30 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Files/Browse/DropdownItems.tsx", () => {
    const { container } = render(<Comp31 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Files/Browse/FileButtons.tsx", () => {
    const { container } = render(<Comp32 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Files/Edit/AfterEdit.tsx", () => {
    const { container } = render(<Comp33 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Files/Edit/BeforeEdit.tsx", () => {
    const { container } = render(<Comp34 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Network/AfterContent.tsx", () => {
    const { container } = render(<Comp35 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Network/BeforeContent.tsx", () => {
    const { container } = render(<Comp36 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Schedules/Edit/AfterEdit.tsx", () => {
    const { container } = render(<Comp37 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Schedules/Edit/BeforeEdit.tsx", () => {
    const { container } = render(<Comp38 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Schedules/List/AfterContent.tsx", () => {
    const { container } = render(<Comp39 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Schedules/List/BeforeContent.tsx", () => {
    const { container } = render(<Comp40 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Settings/AfterContent.tsx", () => {
    const { container } = render(<Comp41 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Settings/BeforeContent.tsx", () => {
    const { container } = render(<Comp42 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Startup/AfterContent.tsx", () => {
    const { container } = render(<Comp43 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Startup/BeforeContent.tsx", () => {
    const { container } = render(<Comp44 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Terminal/AdditionalPowerButtons.tsx", () => {
    const { container } = render(<Comp45 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Terminal/AfterContent.tsx", () => {
    const { container } = render(<Comp46 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Terminal/AfterInformation.tsx", () => {
    const { container } = render(<Comp47 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Terminal/BeforeContent.tsx", () => {
    const { container } = render(<Comp48 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Terminal/BeforeInformation.tsx", () => {
    const { container } = render(<Comp49 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Terminal/CommandRow.tsx", () => {
    const { container } = render(<Comp50 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Users/AfterContent.tsx", () => {
    const { container } = render(<Comp51 />);
    expect(container).toBeDefined();
  });
  it("renders Server/Users/BeforeContent.tsx", () => {
    const { container } = render(<Comp52 />);
    expect(container).toBeDefined();
  });
});
