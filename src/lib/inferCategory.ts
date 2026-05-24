export function inferCategoryFromProductInfo(input: {
  title?: string;
  recognizedTitle?: string;
  description?: string;
}): string | undefined {
  const text = [input.title, input.recognizedTitle, input.description]
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .join(" ")
    .toLowerCase();

  if (!text) {
    return undefined;
  }

  if (/(bra|underwear|lingerie|seamless bra|wire-free|panties|shapewear|文胸|内衣|胸罩|女士内衣)/i.test(text)) {
    return "服饰 > 女士内衣";
  }

  if (/(dress|shirt|pants|blouse|skirt|coat|hoodie|女装|连衣裙|衬衫|裤子|外套)/i.test(text)) {
    return "服饰 > 女装";
  }

  if (/(filter sponge|aquarium|fish tank|水族箱|鱼缸|过滤棉|水族)/i.test(text)) {
    return "宠物用品 > 水族两栖";
  }

  if (/(pet|dog|cat|leash|harness|collar|poop bag|宠物|狗|猫|牵引绳|背带)/i.test(text)) {
    return "宠物用品";
  }

  if (/(ring|necklace|bracelet|earrings|jewelry|戒指|项链|手链|耳环|饰品)/i.test(text)) {
    return "饰品";
  }

  if (/(phone case|charger|cable|stand|手机壳|充电器|数据线|手机支架)/i.test(text)) {
    return "数码配件";
  }

  return undefined;
}
