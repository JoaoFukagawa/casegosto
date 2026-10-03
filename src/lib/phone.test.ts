import { describe, expect, it } from "vitest";
import { formatPhoneBR, isCompletePhone, phoneContains, samePhone } from "./phone";

describe("formatPhoneBR", () => {
  it("formata fixo e celular conforme a quantidade de dígitos", () => {
    expect(formatPhoneBR("4399846749")).toBe("(43) 9984-6749");
    expect(formatPhoneBR("43999846749")).toBe("(43) 99984-6749");
    expect(formatPhoneBR("43 9984-6749")).toBe("(43) 9984-6749");
  });

  it("formata parcialmente enquanto digita", () => {
    expect(formatPhoneBR("4")).toBe("(4");
    expect(formatPhoneBR("4399")).toBe("(43) 99");
    expect(formatPhoneBR("4399846")).toBe("(43) 9984-6");
  });

  it("remove o +55 de número colado", () => {
    expect(formatPhoneBR("+55 43 99984-6749")).toBe("(43) 99984-6749");
    expect(formatPhoneBR("554399846749")).toBe("(43) 9984-6749");
  });

  it("aceita vazio/nulo", () => {
    expect(formatPhoneBR(null)).toBe("");
    expect(formatPhoneBR("")).toBe("");
  });
});

describe("samePhone", () => {
  it("reconhece o mesmo número com e sem o 9º dígito", () => {
    expect(samePhone("43 9984-6749", "(43) 99984-6749")).toBe(true);
    expect(samePhone("43999846749", "4399846749")).toBe(true);
  });

  it("reconhece com e sem DDD / +55", () => {
    expect(samePhone("43 9984-6749", "9984-6749")).toBe(true);
    expect(samePhone("+55 43 99984-6749", "43 9984-6749")).toBe(true);
  });

  it("não confunde números diferentes", () => {
    expect(samePhone("43 9984-6749", "43 9984-6748")).toBe(false);
    expect(samePhone(null, "43 9984-6749")).toBe(false);
  });
});

describe("isCompletePhone", () => {
  it("só considera completo com DDD", () => {
    expect(isCompletePhone("(43) 9984-6749")).toBe(true);
    expect(isCompletePhone("(43) 99984-6749")).toBe(true);
    expect(isCompletePhone("9984-6749")).toBe(false);
  });
});

describe("phoneContains", () => {
  const semNove = "43 9984-6749";
  const comNove = "43999846749";

  it("acha enquanto digita, com ou sem o 9", () => {
    expect(phoneContains(semNove, "(43) 9984")).toBe(true);
    expect(phoneContains(semNove, "(43) 99984")).toBe(true);
    expect(phoneContains(comNove, "(43) 9984-6")).toBe(true);
  });

  it("acha sem DDD", () => {
    expect(phoneContains(semNove, "99846")).toBe(true);
    expect(phoneContains(comNove, "9984-6749")).toBe(true);
  });

  it("exige pelo menos 3 dígitos e ignora cliente sem telefone", () => {
    expect(phoneContains(semNove, "43")).toBe(false);
    expect(phoneContains(null, "439")).toBe(false);
  });
});
