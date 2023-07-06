function getNameArrayAsObject(list: string[]) {
  const result: Record<string, string> = {};

  list.forEach((item) => {
    result[item] = "";
  });

  return result;
}

const regex = /{(.*?)}/g;

export function promptParser(prompt: string) {
  const match = prompt.match(regex);

  const names = (match ?? []).map((m) => m.slice(1, -1));

  const result = {
    numbers: (match || []).length,
    names,
    namesObj: getNameArrayAsObject(names),
    regex
  };

  return result;
}
