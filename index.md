---
layout: default
title: News
---

<ul>
{% for summary in site.pages %}
  {% if summary.path contains 'summaries/' %}
    <li><a href="{{ summary.url | relative_url }}">{{ summary.title }}</a></li>
  {% endif %}
{% endfor %}
</ul>