---
layout: default
title: News
---

# News

Here are the summaries:

{% for summary in site.pages %}
  {% if summary.path contains 'summaries/' %}
    - <a href="{{ file.path | relative_url }}">{{ file.name }}</a>
  {% endif %}
{% endfor %}