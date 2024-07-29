import feedparser
from bs4 import BeautifulSoup
from readability import Document
import time
from datetime import datetime
import os
from mistralai.client import MistralClient
from mistralai.models.chat_completion import ChatMessage
from playwright.sync_api import sync_playwright

# RSS feed URL
rss_url = "https://www.tomshardware.com/feeds/all"

# Mistral AI client setup
api_key = os.getenv("MISTRAL_API_KEY")
model = "mistral-large-latest"
client = MistralClient(api_key=api_key)

# Function to fetch RSS feed
def fetch_rss_feed(url):
    return feedparser.parse(url)

# Function to extract content from a webpage using Playwright
def extract_content(url):
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(url)
        content = page.content()
        browser.close()

    soup = BeautifulSoup(content, 'html.parser')
    doc = Document(soup.prettify())
    return doc.summary()

# Function to summarize content using Mistral AI client
def summarize_content(content):
    messages = [
        ChatMessage(role="user", content=content)
    ]
    chat_response = client.chat(
        model=model,
        messages=messages,
    )
    return chat_response.choices[0].message.content

# Main function
def main():
    feed = fetch_rss_feed(rss_url)
    articles = []

    # Extract content from each article link
    for entry in feed.entries:
        link = entry.link
        print(f"Processing: {link}")
        content = extract_content(link)
        articles.append(f"URL: {link}\n\n{content}")
        time.sleep(5)  # Delay between requests

    # Concatenate all articles content
    full_content = "\n\n".join(articles)

    # Add the prompt for Mistral API
    prompt = (
        "This text contains several articles. I'd like you to summarize them exhaustively, "
        "leaving no detail out. Be sure to mention the sources at the end of the summary. "
        "Please answer in Markdown.\n\n"
    )
    full_content = prompt + full_content

    # Summarize the content
    summary = summarize_content(full_content)

    # Generate Markdown file
    date_str = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    filename = f"{date_str}.md"
    with open(filename, "w") as f:
        f.write(summary)

    print(f"Summary generated and saved to {filename}")

if __name__ == "__main__":
    main()
