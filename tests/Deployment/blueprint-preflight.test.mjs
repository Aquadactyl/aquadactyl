import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

test("Blueprint preflight compiles unchanged legacy interfaces and blocks unsupported imports", () => {
  const bundle = fs.mkdtempSync(path.join(os.tmpdir(), "blueprint-preflight-"));
  const manifest = path.resolve("public/build/manifest.json");
  const before = fs.existsSync(manifest)
    ? fs.readFileSync(manifest, "utf8")
    : undefined;
  const marker = path.join(bundle, "script-executed");
  try {
    fs.mkdirSync(path.join(bundle, "components"));
    fs.writeFileSync(path.join(bundle, "install.sh"), `touch '${marker}'\n`);
    const component = path.join(bundle, "components/Legacy.tsx");
    fs.writeFileSync(
      path.join(bundle, "components/Helper.tsx"),
      "export default () => <span>Self import</span>;",
    );
    fs.writeFileSync(
      component,
      `
      import React from 'react';
      import tw from 'twin.macro';
      import { useStoreActions, Actions } from 'easy-peasy';
      import { ApplicationStore } from '@/state';
      import { useHistory, NavLink } from 'react-router-dom';
      import { Formik, Form } from 'formik';
      import * as Yup from 'yup';
      import Field from '@/components/elements/Field';
      import Helper from '@blueprint/extensions/legacy/Helper';
      import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
      import { faServer } from '@fortawesome/free-solid-svg-icons';
      import { faGithub } from '@fortawesome/free-brands-svg-icons';
      import { faFile } from '@fortawesome/free-regular-svg-icons';
      const Card = tw.div\`bg-neutral-800 text-primary-500 p-4\`;
      export default function Legacy() {
        const add = useStoreActions((actions: Actions<ApplicationStore>) => actions.flashes.addError);
        const history = useHistory();
        return <Card><Helper /><NavLink to='/account'>Account</NavLink>
          <FontAwesomeIcon icon={faServer} /><FontAwesomeIcon icon={faGithub} /><FontAwesomeIcon icon={faFile} />
          <Formik initialValues={{ name: '' }} validationSchema={Yup.object({ name: Yup.string().required() })}
            onSubmit={() => { add({ message: 'legacy' }); history.push('/account'); }}>
            <Form><Field name='name' label='Name' /><button css={tw\`p-2\`}>Save</button></Form>
          </Formik></Card>;
      }
    `,
    );
    const check = (components = "components") =>
      spawnSync(
        process.execPath,
        ["scripts/helpers/check-blueprint.mjs", bundle, components, "legacy"],
        { encoding: "utf8", timeout: 60000 },
      );
    let result = check();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Frontend compiled successfully/);
    assert.match(result.stdout, /custom lifecycle scripts/);
    assert.equal(fs.existsSync(marker), false);
    assert.equal(
      fs.existsSync(manifest) ? fs.readFileSync(manifest, "utf8") : undefined,
      before,
    );

    fs.writeFileSync(
      component,
      `import { createStore } from 'easy-peasy'; export default createStore({});`,
    );
    result = check();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /createStore/);
    assert.match(result.stderr, /unsupported dependency or panel interface/);
    assert.equal(fs.existsSync(marker), false);

    result = check("../outside");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /stay inside/);
    result = check("");
    assert.equal(result.status, 0);
    assert.match(result.stdout, /No frontend components/);
    fs.unlinkSync(component);
    fs.unlinkSync(path.join(bundle, "components/Helper.tsx"));
    result = check();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /no JavaScript or TypeScript/);
  } finally {
    fs.rmSync(bundle, { recursive: true, force: true });
  }
});
